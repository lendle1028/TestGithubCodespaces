#!/usr/bin/env node
/**
 * relay.js — rate-limiting reverse proxy for OpenCode Go
 *
 * 課堂專用防濫用中繼伺服器：
 * - 限制學生在 30 分鐘內的 API 請求頻率，超出額度則給予延遲 (Delay) 懲罰。
 * - 純串流 (Streaming) 轉發，不攔截 Request Body，記憶體佔用極低。
 * - 自動注入正確的 API Key。
 *
 * 【計費規則 (每 30 分鐘重置)】
 *   1-15 次   -> 無延遲 (0s)
 *   16-40 次  -> 每次延遲 5s
 *   41-70 次  -> 每次延遲 15s
 *   71-95 次  -> 每次延遲 30s
 *   96 次以上 -> 每次延遲 60s
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// ---- Config ----
const LISTEN_PORT = process.env.RELAY_PORT || 4141;

// 測試階段：指向 Zen。正式上線時：改回 https://opencode.ai
const UPSTREAM_BASE = process.env.UPSTREAM_BASE || 'https://opencode.ai'; 

// 注入的 API Key。在 Codespace 中，請設為環境變數 (Secrets)
const UPSTREAM_API_KEY = process.env.GO_API_KEY || 'zen-test-key-or-leave-empty';

const CYCLE_MS = 30 * 60 * 1000; 

// ---- Rate limiter state ----
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

// ---- Proxy server ----
const server = http.createServer((req, res) => {
  const wait = delayForNextRequest();
  const n = count;

  const forward = () => {
    let targetUrl;
    try {
      targetUrl = new URL(req.url, UPSTREAM_BASE);
    } catch (err) {
      res.writeHead(400);
      res.end('Bad request URL');
      return;
    }

    // 抽離原始的 host，其餘 Headers 原封不動
    const { host, authorization, ...restHeaders } = req.headers;
    
    const finalHeaders = {
        ...restHeaders,
        host: targetUrl.host
    };

    if(UPSTREAM_API_KEY!='zen-test-key-or-leave-empty' && UPSTREAM_API_KEY!="" && UPSTREAM_API_KEY){
        finalHeaders['authorization'] = `Bearer ${UPSTREAM_API_KEY}`;
    }

    const upstreamReq = https.request(
        targetUrl,
        {
            method: req.method,
            headers: finalHeaders,
        },
        (upstreamRes) => {
            // 將上游回應的 HTTP 狀態碼與 Headers 寫回
            res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
            // 完美 Streaming 上游的回應內容 (包含 SSE) 到學生端
            upstreamRes.pipe(res); 
        }
    );

    upstreamReq.on('error', (err) => {
        console.error('[relay] Upstream error:', err.message);
        if (!res.headersSent) res.writeHead(502);
        res.end('Upstream request failed');
    });

    // 完美 Streaming 學生端的請求內容 (包含巨大的 Base64 圖片) 到上游
    req.pipe(upstreamReq);
  };

  console.log(`[relay] request #${n} in cycle, delay=${wait}ms, ${req.method} ${req.url}`);

  if (wait > 0) {
    setTimeout(forward, wait);
  } else {
    forward();
  }
});

server.listen(LISTEN_PORT, '127.0.0.1', () => {
  console.log(`[relay] listening on http://127.0.0.1:${LISTEN_PORT}, forwarding to ${UPSTREAM_BASE}`);
  console.log(`[relay] Stream-only mode active. Model selection must be handled via opencode.json.`);
});