#!/usr/bin/env node
/**
 * relay.js — rate-limiting reverse proxy for OpenCode
 *
 * 課堂專用中繼伺服器：
 *
 * - 每 30 分鐘限制 API request 次數，超出後增加 Delay
 * - OpenCode 使用標準 OpenAI-compatible endpoint：
 *
 *       http://127.0.0.1:4141/v1
 *
 * - Relay 將：
 *
 *       /v1/...
 *
 *   轉送到：
 *
 *       https://openrouter.ai/api/v1/...
 *
 * - 對 Chat Completions JSON request 修改 OpenRouter model / models
 * - Request body 只在需要修改時暫存
 * - Response 完全 Streaming，不暫存 SSE
 * - 自動注入 OpenRouter API Key
 * - DEBUG 模式可查看 request messages 摘要
 *
 * ------------------------------------------------------------
 * Environment variables
 * ------------------------------------------------------------
 *
 * RELAY_PORT
 * UPSTREAM_BASE
 * OPENROUTER_API_KEY
 * GO_API_KEY              ← 舊名稱，相容保留
 * PRIMARY_MODEL
 * FALLBACK_MODELS
 * MAX_BODY_SIZE
 * DEBUG
 *
 * ------------------------------------------------------------
 * Example
 * ------------------------------------------------------------
 *
 * OPENROUTER_API_KEY=sk-or-v1-xxxx
 *
 * PRIMARY_MODEL=qwen/qwen3.8-27b:free
 *
 * FALLBACK_MODELS=google/gemma-4-31b-it:free,openrouter/auto
 *
 */

const http = require('http');
const https = require('https');


// ============================================================
// Config
// ============================================================

const LISTEN_PORT =
  Number(
    process.env.RELAY_PORT || 4141
  );


// ------------------------------------------------------------
// Upstream
// ------------------------------------------------------------
//
// OpenCode:
//   http://127.0.0.1:4141/v1
//
// Relay:
//   /v1/chat/completions
//
// OpenRouter:
//   https://openrouter.ai/api/v1/chat/completions
//

const UPSTREAM_BASE =
  process.env.UPSTREAM_BASE ||
  'https://openrouter.ai/api/v1';


// ------------------------------------------------------------
// API Key
// ------------------------------------------------------------
//
// 優先使用 OPENROUTER_API_KEY。
// 為了相容舊設定，也接受 GO_API_KEY。
//

const UPSTREAM_API_KEY =
  process.env.OPENROUTER_API_KEY ||
  process.env.GO_API_KEY ||
  '';


// 如果沒有 API key，直接停止。
// 不要讓 request 跑到 OpenRouter 才得到
// "Missing Authentication header"。
//
if (!UPSTREAM_API_KEY) {

  console.error(
    '[relay] ERROR: OpenRouter API key is missing.'
  );

  console.error(
    '[relay] Set OPENROUTER_API_KEY or GO_API_KEY.'
  );

  process.exit(1);
}


// 每 30 分鐘一個 cycle
const CYCLE_MS =
  30 * 60 * 1000;


// 最大 request body
const MAX_BODY_SIZE =
  Number(
    process.env.MAX_BODY_SIZE ||
    50 * 1024 * 1024
  );


// Debug
//
// DEBUG=1 node relay.js
//
const DEBUG =
  process.env.DEBUG === '1' ||
  process.env.DEBUG === 'true';


// ============================================================
// OpenRouter model routing
// ============================================================

const PRIMARY_MODEL =
  process.env.PRIMARY_MODEL ||
  'cohere/north-mini-code:free';


const FALLBACK_MODELS = (
  process.env.FALLBACK_MODELS ||
  'qwen/qwen3.8-27b:free,openrouter/auto'
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


// ============================================================
// Rate limiter
// ============================================================

let cycleStart = Date.now();

let count = 0;


function delayForNextRequest() {

  const now = Date.now();


  // ----------------------------------------------------------
  // Reset every 30 minutes
  // ----------------------------------------------------------

  if (
    now - cycleStart >= CYCLE_MS
  ) {

    cycleStart = now;

    count = 0;

    console.log(
      '[relay] rate-limit cycle reset'
    );
  }


  count += 1;


  // ----------------------------------------------------------
  // Delay policy
  // ----------------------------------------------------------

  if (count <= 15) {
    return 0;
  }

  if (count <= 40) {
    return 5000;
  }

  if (count <= 70) {
    return 15000;
  }

  if (count <= 95) {
    return 30000;
  }

  return 60000;
}


// ============================================================
// Build upstream URL
// ============================================================
//
// Input:
//
//   /v1/chat/completions
//
// Output:
//
//   https://openrouter.ai/api/v1/chat/completions
//
// 不使用：
//
//   new URL('/chat/completions', base)
//
// 因為那會把 /api/v1 蓋掉。
//

function buildUpstreamUrl(reqUrl) {

  const rawUrl =
    reqUrl || '/';


  // ----------------------------------------------------------
  // Separate path and query
  // ----------------------------------------------------------

  const questionIndex =
    rawUrl.indexOf('?');


  let requestPath;
  let requestQuery;


  if (questionIndex >= 0) {

    requestPath =
      rawUrl.slice(
        0,
        questionIndex
      );

    requestQuery =
      rawUrl.slice(
        questionIndex
      );

  } else {

    requestPath =
      rawUrl;

    requestQuery =
      '';
  }


  // ----------------------------------------------------------
  // Remove local /v1
  // ----------------------------------------------------------

  let upstreamPath;


  if (
    requestPath === '/v1'
  ) {

    upstreamPath =
      '';

  } else if (
    requestPath.startsWith('/v1/')
  ) {

    upstreamPath =
      requestPath.slice(3);

  } else {

    upstreamPath =
      requestPath;
  }


  // ----------------------------------------------------------
  // Normalize
  // ----------------------------------------------------------

  if (
    !upstreamPath.startsWith('/')
  ) {

    upstreamPath =
      '/' + upstreamPath;
  }


  // ----------------------------------------------------------
  // Normalize base
  // ----------------------------------------------------------

  const base =
    UPSTREAM_BASE.replace(
      /\/+$/,
      ''
    );


  // ----------------------------------------------------------
  // Final URL
  // ----------------------------------------------------------

  return (
    base +
    upstreamPath +
    requestQuery
  );
}


// ============================================================
// Request type detection
// ============================================================

function isChatCompletionRequest(
  req,
  upstreamUrl
) {

  if (req.method !== 'POST') {
    return false;
  }


  if (
    !upstreamUrl.endsWith(
      '/chat/completions'
    ) &&
    !upstreamUrl.includes(
      '/chat/completions?'
    )
  ) {

    return false;
  }


  const contentType =
    req.headers['content-type'] ||
    '';


  return contentType
    .toLowerCase()
    .includes(
      'application/json'
    );
}


// ============================================================
// Collect request body
// ============================================================

function collectRequestBody(req) {

  return new Promise(
    (resolve, reject) => {

      const chunks = [];

      let totalSize = 0;

      let rejected = false;


      req.on(
        'data',
        chunk => {

          if (rejected) {
            return;
          }


          totalSize +=
            chunk.length;


          if (
            totalSize >
            MAX_BODY_SIZE
          ) {

            rejected = true;


            reject(
              new Error(
                `Request body exceeds MAX_BODY_SIZE (${MAX_BODY_SIZE} bytes)`
              )
            );


            req.destroy();

            return;
          }


          chunks.push(chunk);
        }
      );


      req.on(
        'end',
        () => {

          if (!rejected) {

            resolve(
              Buffer.concat(
                chunks
              )
            );
          }
        }
      );


      req.on(
        'error',
        err => {

          if (!rejected) {
            reject(err);
          }
        }
      );
    }
  );
}


// ============================================================
// Debug: summarize messages
// ============================================================

function summarizeMessages(body) {

  if (
    !body ||
    !Array.isArray(
      body.messages
    )
  ) {

    return '(no messages)';
  }


  return body.messages
    .map(
      (message, index) => {

        const role =
          message?.role ||
          '?';


        let content = '';


        if (
          typeof message?.content ===
          'string'
        ) {

          content =
            message.content;

        } else if (
          Array.isArray(
            message?.content
          )
        ) {

          content =
            '[multimodal content]';

        } else if (
          message?.content != null
        ) {

          content =
            `[${typeof message.content}]`;
        }


        // 不把完整 prompt 寫進 log
        content =
          content
            .replace(
              /\s+/g,
              ' '
            )
            .slice(
              0,
              120
            );


        return (
          `${index}:${role}` +
          (
            content
              ? ` "${content}"`
              : ''
          )
        );
      }
    )
    .join(' | ');
}


// ============================================================
// Rewrite OpenRouter body
// ============================================================

function rewriteOpenRouterBody(
  bodyBuffer
) {

  let body;


  try {

    body =
      JSON.parse(
        bodyBuffer.toString(
          'utf8'
        )
      );

  } catch (err) {

    throw new Error(
      'Invalid JSON request body'
    );
  }


  // ----------------------------------------------------------
  // Debug original request
  // ----------------------------------------------------------

  if (DEBUG) {

    console.log(
      `[relay] original model: ` +
      `${body.model || '(none)'}`
    );


    console.log(
      `[relay] messages: ` +
      `${summarizeMessages(body)}`
    );


    console.log(
      `[relay] stream: ` +
      `${body.stream === true}`
    );


    if (
      Array.isArray(
        body.tools
      )
    ) {

      console.log(
        `[relay] tools: ` +
        `${body.tools.length}`
      );
    }


    if (
      body.tool_choice
    ) {

      console.log(
        `[relay] tool_choice: ` +
        `${JSON.stringify(
          body.tool_choice
        )}`
      );
    }
  }


  // ----------------------------------------------------------
  // Force routing
  // ----------------------------------------------------------

  body.model =
    PRIMARY_MODEL;


  body.models =
    FALLBACK_MODELS;


  // ----------------------------------------------------------
  // Return rewritten body
  // ----------------------------------------------------------

  return Buffer.from(
    JSON.stringify(body),
    'utf8'
  );
}


// ============================================================
// Proxy server
// ============================================================

const server =
  http.createServer(
    async (req, res) => {

      // --------------------------------------------------------
      // Rate limit
      // --------------------------------------------------------

      const wait =
        delayForNextRequest();


      const requestNumber =
        count;


      // --------------------------------------------------------
      // Build upstream URL
      // --------------------------------------------------------

      let upstreamUrl;


      try {

        upstreamUrl =
          buildUpstreamUrl(
            req.url
          );

      } catch (err) {

        console.error(
          '[relay] URL error:',
          err.message
        );


        res.writeHead(
          400,
          {
            'content-type':
              'text/plain; charset=utf-8'
          }
        );


        res.end(
          'Bad request URL'
        );


        return;
      }


      // --------------------------------------------------------
      // Request log
      // --------------------------------------------------------

      console.log(
        `[relay] request #${requestNumber}, ` +
        `delay=${wait}ms, ` +
        `${req.method} ${req.url}`
      );


      console.log(
        `[relay] upstream target: ` +
        `${upstreamUrl}`
      );


      // --------------------------------------------------------
      // Delay
      // --------------------------------------------------------

      if (wait > 0) {

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              wait
            )
        );
      }


      // --------------------------------------------------------
      // Parse URL
      // --------------------------------------------------------

      let targetUrl;


      try {

        targetUrl =
          new URL(
            upstreamUrl
          );

      } catch (err) {

        console.error(
          '[relay] invalid upstream URL:',
          upstreamUrl
        );


        res.writeHead(
          502,
          {
            'content-type':
              'text/plain; charset=utf-8'
          }
        );


        res.end(
          'Invalid upstream URL'
        );


        return;
      }


      // --------------------------------------------------------
      // Headers
      // --------------------------------------------------------

      const {
        host,
        authorization,
        'content-length':
          originalContentLength,
        ...restHeaders
      } = req.headers;


      const finalHeaders = {
        ...restHeaders,

        host:
          targetUrl.host
      };


      // --------------------------------------------------------
      // Determine rewrite
      // --------------------------------------------------------

      const shouldRewrite =
        isChatCompletionRequest(
          req,
          upstreamUrl
        );


      let requestBody = null;


      // --------------------------------------------------------
      // Read / rewrite JSON body
      // --------------------------------------------------------

      if (shouldRewrite) {

        try {

          console.log(
            `[relay] rewriting OpenRouter routing: ` +
            `${PRIMARY_MODEL} -> [` +
            `${FALLBACK_MODELS.join(
              ', '
            )}]`
          );


          const originalBody =
            await collectRequestBody(
              req
            );


          requestBody =
            rewriteOpenRouterBody(
              originalBody
            );


          // JSON 已重新 stringify
          finalHeaders[
            'content-length'
          ] =
            requestBody.length;


          delete finalHeaders[
            'transfer-encoding'
          ];


        } catch (err) {

          console.error(
            '[relay] request body error:',
            err.message
          );


          if (
            !res.headersSent
          ) {

            res.writeHead(
              err.message.includes(
                'MAX_BODY_SIZE'
              )
                ? 413
                : 400,
              {
                'content-type':
                  'text/plain; charset=utf-8'
              }
            );
          }


          res.end(
            err.message
          );


          return;
        }
      }


      // --------------------------------------------------------
      // ALWAYS inject OpenRouter authentication
      // --------------------------------------------------------
      //
      // OpenRouter expects:
      //
      // Authorization: Bearer <API_KEY>
      //
      // The student's Authorization header is deliberately
      // ignored. The Relay owns the upstream credential.
      //

      finalHeaders.authorization =
        `Bearer ${UPSTREAM_API_KEY}`;


      // --------------------------------------------------------
      // Upstream request
      // --------------------------------------------------------

      const upstreamReq =
        https.request(
          targetUrl,
          {
            method:
              req.method,

            headers:
              finalHeaders
          },

          upstreamRes => {

            console.log(
              `[relay] upstream ` +
              `${upstreamRes.statusCode} ` +
              `${req.method} ` +
              `${upstreamUrl}`
            );


            // --------------------------------------------------
            // Response lifecycle
            // --------------------------------------------------

            upstreamRes.on(
              'end',
              () => {

                console.log(
                  `[relay] upstream END ` +
                  `request #${requestNumber}`
                );
              }
            );


            upstreamRes.on(
              'close',
              () => {

                console.log(
                  `[relay] upstream CLOSE ` +
                  `request #${requestNumber}`
                );
              }
            );


            upstreamRes.on(
              'error',
              err => {

                console.error(
                  `[relay] upstream response error ` +
                  `request #${requestNumber}:`,
                  err.message
                );
              }
            );


            // --------------------------------------------------
            // Response streaming
            // --------------------------------------------------

            res.writeHead(
              upstreamRes.statusCode,
              upstreamRes.headers
            );


            upstreamRes.pipe(
              res
            );
          }
        );


      // --------------------------------------------------------
      // Upstream request error
      // --------------------------------------------------------

      upstreamReq.on(
        'error',
        err => {

          console.error(
            `[relay] upstream request error ` +
            `request #${requestNumber}:`,
            err.message
          );


          if (
            !res.headersSent
          ) {

            res.writeHead(
              502,
              {
                'content-type':
                  'text/plain; charset=utf-8'
              }
            );
          }


          res.end(
            'Upstream request failed'
          );
        }
      );


      // --------------------------------------------------------
      // Client aborted
      // --------------------------------------------------------

      req.on(
        'aborted',
        () => {

          console.log(
            `[relay] client aborted ` +
            `request #${requestNumber}`
          );


          upstreamReq.destroy();
        }
      );


      // --------------------------------------------------------
      // Client response closed
      // --------------------------------------------------------

      res.on(
        'close',
        () => {

          if (
            !res.writableFinished
          ) {

            console.log(
              `[relay] client response closed ` +
              `request #${requestNumber}`
            );
          }
        }
      );


      // --------------------------------------------------------
      // Send request
      // --------------------------------------------------------

      if (shouldRewrite) {

        upstreamReq.end(
          requestBody
        );

      } else {

        req.pipe(
          upstreamReq
        );
      }
    }
  );


// ============================================================
// Start
// ============================================================

server.listen(
  LISTEN_PORT,
  '127.0.0.1',
  () => {

    console.log(
      `[relay] listening on ` +
      `http://127.0.0.1:${LISTEN_PORT}`
    );


    console.log(
      `[relay] forwarding to ` +
      `${UPSTREAM_BASE}`
    );


    console.log(
      `[relay] PRIMARY_MODEL = ` +
      `${PRIMARY_MODEL}`
    );


    console.log(
      `[relay] FALLBACK_MODELS = ` +
      `${FALLBACK_MODELS.join(
        ', '
      )}`
    );


    console.log(
      `[relay] MAX_BODY_SIZE = ` +
      `${MAX_BODY_SIZE} bytes`
    );


    console.log(
      `[relay] DEBUG = ` +
      `${DEBUG}`
    );


    console.log(
      `[relay] API key = configured`
    );


    console.log(
      `[relay] OpenRouter routing rewrite active`
    );
  }
);