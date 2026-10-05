#!/usr/bin/env node
/**
 * relay.js — rate-limiting reverse proxy for OpenCode Go
 *
 * 課堂專用中繼伺服器：
 * - 每 30 分鐘限制 API request 次數，超出後增加 Delay
 * - 對 Chat Completions JSON request 修改 OpenRouter model / models
 * - Request body 只在需要修改時暫存
 * - Response 完全 Streaming，不暫存 SSE
 * - 自動注入 API Key
 *
 * 預設 routing：
 *
 *   model:
 *     poolside/laguna-s-2.1:free
 *
 *   models:
 *     nvidia/nemotron-3-ultra-550b-a55b:free
 *     openrouter/auto
 *
 * 可以用環境變數修改：
 *
 *   PRIMARY_MODEL
 *   FALLBACK_MODELS
 *
 * 例如：
 *
 *   PRIMARY_MODEL=poolside/laguna-s-2.1:free
 *   FALLBACK_MODELS=qwen/qwen3.8-27b:free,openrouter/auto
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// ------------------------------------------------------------
// Config
// ------------------------------------------------------------

const LISTEN_PORT = process.env.RELAY_PORT || 4141;

// 正式環境：例如 https://openrouter.ai
const UPSTREAM_BASE =
  process.env.UPSTREAM_BASE || 'https://openrouter.ai';

// API Key
const UPSTREAM_API_KEY =
  process.env.GO_API_KEY || '';

// 每 30 分鐘一個 cycle
const CYCLE_MS = 30 * 60 * 1000;

// 最多允許暫存的 request body 大小
// 避免意外的大型 request 吃光 Codespace 記憶體
const MAX_BODY_SIZE =
  Number(process.env.MAX_BODY_SIZE || 50 * 1024 * 1024);

// ------------------------------------------------------------
// OpenRouter model routing
// ------------------------------------------------------------

const PRIMARY_MODEL =
  process.env.PRIMARY_MODEL ||
  'cohere/north-mini-code:free';

const FALLBACK_MODELS = (
  process.env.FALLBACK_MODELS ||
  '"qwen/qwen3.8-27b:free","openrouter/auto"'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// OpenRouter models array 最多 3 個
if (FALLBACK_MODELS.length > 3) {
  throw new Error(
    `FALLBACK_MODELS can contain at most 3 models, got ${FALLBACK_MODELS.length}`
  );
}

// ------------------------------------------------------------
// Rate limiter state
// ------------------------------------------------------------

let cycleStart = Date.now();
let count = 0;

function delayForNextRequest() {
  const now = Date.now();

  if (now - cycleStart >= CYCLE_MS) {
    cycleStart = now;
    count = 0;
  }

  count += 1;

  if (count <= 15) return 0;
  if (count <= 40) return 5000;
  if (count <= 70) return 15000;
  if (count <= 95) return 30000;

  return 60000;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function isChatCompletionRequest(req, targetUrl) {
  if (req.method !== 'POST') {
    return false;
  }

  if (!targetUrl.pathname.endsWith('/chat/completions')) {
    return false;
  }

  const contentType =
    req.headers['content-type'] || '';

  return contentType
    .toLowerCase()
    .includes('application/json');
}


function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;

    req.on('data', chunk => {
      totalSize += chunk.length;

      if (totalSize > MAX_BODY_SIZE) {
        reject(
          new Error(
            `Request body exceeds MAX_BODY_SIZE (${MAX_BODY_SIZE} bytes)`
          )
        );

        // 停止繼續接收
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', reject);
  });
}


function rewriteOpenRouterBody(bodyBuffer) {
  let body;

  try {
    body = JSON.parse(bodyBuffer.toString('utf8'));
  } catch (err) {
    throw new Error('Invalid JSON request body');
  }

  // 強制指定 model
  body.model = PRIMARY_MODEL;

  // 強制指定 fallback models
  body.models = FALLBACK_MODELS;

  return Buffer.from(
    JSON.stringify(body),
    'utf8'
  );
}


// ------------------------------------------------------------
// Proxy
// ------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const wait = delayForNextRequest();
  const requestNumber = count;

  let targetUrl;

  try {
    targetUrl = new URL(req.url, UPSTREAM_BASE);
  } catch (err) {
    res.writeHead(400);
    res.end('Bad request URL');
    return;
  }

  console.log(
    `[relay] request #${requestNumber}, ` +
    `delay=${wait}ms, ` +
    `${req.method} ${req.url}`
  );

  if (wait > 0) {
    await new Promise(resolve => setTimeout(resolve, wait));
  }

  // ----------------------------------------------------------
  // Headers
  // ----------------------------------------------------------

  const {
    host,
    authorization,
    'content-length': originalContentLength,
    ...restHeaders
  } = req.headers;

  const finalHeaders = {
    ...restHeaders,
    host: targetUrl.host
  };

  // ----------------------------------------------------------
  // Determine whether body must be modified
  // ----------------------------------------------------------

  const shouldRewrite =
    isChatCompletionRequest(req, targetUrl);

  let requestBody = null;

  if (shouldRewrite) {
    try {
      console.log(
        `[relay] rewriting OpenRouter routing: ` +
        `${PRIMARY_MODEL} -> [` +
        `${FALLBACK_MODELS.join(', ')}]`
      );

      requestBody = await collectRequestBody(req);

      requestBody =
        rewriteOpenRouterBody(requestBody);

      // 原本的 Content-Length 已經不一定正確
      finalHeaders['content-length'] =
        requestBody.length;

    } catch (err) {
      console.error(
        '[relay] request body error:',
        err.message
      );

      if (!res.headersSent) {
        res.writeHead(
          err.message.includes('MAX_BODY_SIZE')
            ? 413
            : 400,
          {
            'content-type': 'text/plain; charset=utf-8'
          }
        );
      }

      res.end(err.message);
      return;
    }
  }

  // ----------------------------------------------------------
  // Inject API key
  // ----------------------------------------------------------

  if (UPSTREAM_API_KEY) {
    finalHeaders.authorization =
      `Bearer ${UPSTREAM_API_KEY}`;
  }

  // ----------------------------------------------------------
  // Upstream request
  // ----------------------------------------------------------

  const upstreamReq = https.request(
    targetUrl,
    {
      method: req.method,
      headers: finalHeaders
    },
    upstreamRes => {

      console.log(
        `[relay] upstream ${upstreamRes.statusCode} ` +
        `${req.method} ${req.url}`
      );

      // Response 完全 streaming
      res.writeHead(
        upstreamRes.statusCode,
        upstreamRes.headers
      );

      upstreamRes.pipe(res);
    }
  );

  upstreamReq.on('error', err => {
    console.error(
      '[relay] upstream error:',
      err.message
    );

    if (!res.headersSent) {
      res.writeHead(502);
    }

    res.end('Upstream request failed');
  });

  // ----------------------------------------------------------
  // Send request body
  // ----------------------------------------------------------

  if (shouldRewrite) {

    // 已經修改過 body
    upstreamReq.end(requestBody);

  } else {

    // 完全透明 streaming
    req.pipe(upstreamReq);
  }
});


// ------------------------------------------------------------
// Start
// ------------------------------------------------------------

server.listen(
  LISTEN_PORT,
  '127.0.0.1',
  () => {

    console.log(
      `[relay] listening on ` +
      `http://127.0.0.1:${LISTEN_PORT}`
    );

    console.log(
      `[relay] forwarding to ${UPSTREAM_BASE}`
    );

    console.log(
      `[relay] PRIMARY_MODEL = ${PRIMARY_MODEL}`
    );

    console.log(
      `[relay] FALLBACK_MODELS = ` +
      `${FALLBACK_MODELS.join(', ')}`
    );

    console.log(
      `[relay] MAX_BODY_SIZE = ` +
      `${MAX_BODY_SIZE} bytes`
    );

    console.log(
      `[relay] OpenRouter routing rewrite active`
    );
  }
);