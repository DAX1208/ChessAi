# AI Chess Chatbot

A browser-based chess AI chat UI that talks to an n8n workflow through a small local proxy (avoids CORS issues).

## Project structure

- `index.html` — Chat UI
- `style.css` — Styling (chess-ai-chat theme)
- `script.js` — Client chat logic
- `server.js` — Local static server + `/api/chat` proxy to n8n
- `AI Chess Chatbot.json` — n8n workflow (import and activate in n8n)

## Quick start

1. **Activate the n8n workflow**
   - Import `AI Chess Chatbot.json` into your n8n instance
   - Turn the workflow **on** (toggle top-right). The webhook only works while active
   - Confirm the production URL matches `WEBHOOK_URL` in `server.js`. For **Hosted Chat** mode, use the full Chat URL including `/chat` (default: `https://devangi.app.n8n.cloud/webhook/chess-chatbot-webhook-001/chat`)

2. **Run the local server** (required — do not open `index.html` as a file)

```bash
npm start
```

3. Open **http://localhost:3000** in your browser.

## Why a local server?

Browsers block direct calls from `file://` or `localhost` to the n8n webhook (**Failed to fetch** / CORS). `server.js` serves the UI and forwards messages to n8n with the correct Chat Trigger payload:

```json
{
  "action": "sendMessage",
  "chatInput": "your message",
  "sessionId": "session_..."
}
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Local server port |
| `WEBHOOK_URL` | n8n production webhook URL | Set before `npm start` if your URL differs |

Example:

```bash
set WEBHOOK_URL=https://your-instance.app.n8n.cloud/webhook/your-id
npm start
```

## Response format

The client reads the assistant reply from any of: `output`, `text`, `answer`, `response`, or `message` in the JSON response.

## Troubleshooting

| Error | Fix |
|-------|-----|
| **Failed to fetch** | Use `npm start` and open http://localhost:3000 — not the HTML file directly |
| **Webhook is not registered** | Activate the workflow in n8n |
| Empty / wrong reply | In the Chat Trigger node, set **Response Mode** to *When Last Node Finishes* and ensure the agent returns `output` or `text` |
