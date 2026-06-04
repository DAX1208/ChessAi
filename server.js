const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

/** Hosted Chat mode in n8n requires the /chat suffix on the webhook URL. */
function resolveWebhookUrl() {
  const raw =
    process.env.WEBHOOK_URL ||
    'https://devangi.app.n8n.cloud/webhook/chess-chatbot-webhook-001/chat';
  const trimmed = raw.replace(/\/+$/, '');
  if (trimmed.endsWith('/chat')) {
    return trimmed;
  }
  return `${trimmed}/chat`;
}

const WEBHOOK_URL = resolveWebhookUrl();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function serveStatic(filePath, res) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

async function forwardToN8n({ chatInput, sessionId }) {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'sendMessage',
      chatInput,
      sessionId,
    }),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { output: text };
  }

  return { status: response.status, data, raw: text };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const incoming = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const chatInput = (incoming.message || incoming.chatInput || '').trim();

        if (!chatInput) {
          sendJson(res, 400, { error: 'Message is required.' });
          return;
        }

        const sessionId = incoming.sessionId || `session_${Date.now()}`;
        const { status, data, raw } = await forwardToN8n({ chatInput, sessionId });

        if (status === 404) {
          sendJson(res, 502, {
            error:
              'n8n webhook returned 404. Activate the "AI Chess Chatbot" workflow in n8n, confirm the Chat URL ends with /chat, restart the local server (npm start), then try again.',
            webhookUrl: WEBHOOK_URL,
            n8nStatus: status,
            n8nBody: data,
          });
          return;
        }

        if (!responseOk(status)) {
          sendJson(res, 502, {
            error: `Webhook returned ${status}.`,
            n8nStatus: status,
            n8nBody: data ?? raw,
          });
          return;
        }

        sendJson(res, 200, { sessionId, ...(data && typeof data === 'object' ? data : { output: raw }) });
      } catch (error) {
        sendJson(res, 502, {
          error: error.message || 'Failed to reach the n8n webhook.',
        });
      }
    });
    return;
  }

  const safePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.normalize(path.join(ROOT, safePath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  serveStatic(filePath, res);
});

function responseOk(status) {
  return status >= 200 && status < 300;
}

server.listen(PORT, () => {
  console.log(`Chess chat running at http://localhost:${PORT}`);
  console.log(`Proxying to ${WEBHOOK_URL}`);
});
