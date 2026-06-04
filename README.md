# AI Chess Chatbot

A lightweight browser-based AI chat interface that sends user messages to an n8n webhook and displays assistant responses in a minimal chat UI.



## Project structure

- `index.html` - Chat UI markup and page layout.
- `style.css` - Chat styling and responsive appearance.
- `script.js` - Client-side logic for sending messages to the webhook and rendering responses.
- `AI Chess Chatbot.json` - n8n workflow definition for the webhook endpoint and AI agent flow.

## Webhook endpoint

The client uses the webhook URL configured in `script.js`:

`https://devangi.app.n8n.cloud/webhook/chess-chatbot-webhook-001/chat`

## How it works

1. The user types a message and submits the chat form.
2. `script.js` sends a POST request to the webhook endpoint with `{ message }`.
3. The n8n workflow receives the message and routes it through the AI agent.
4. The response is returned to the browser and displayed in the chat window.

## n8n workflow overview

The `AI Chess Chatbot.json` definition includes:

- `When Chat Message Received` - webhook trigger node using `webhookId: chess-chatbot-webhook-001`.
- `AI Agent` - LangChain agent configured as a chess coach and analysis assistant.
- `Window Buffer Memory` - memory buffer to maintain conversational context.
- `SerpAPI Web Search` - optional search tool for live chess news and rankings.
- `Groq Chat Model` - language model node using `qwen/qwen3-32b`.

## Usage

- Open `index.html` in a browser.
- Type a message in the input field.
- Click **Send message** or press **Enter**.
- The assistant reply appears in the chat window.

## Notes

- Replace `WEBHOOK_URL` in `script.js` if you want to use a different webhook.
- The frontend expects the webhook response to contain one of these fields: `answer`, `response`, or `message`.

## Suggested improvements

- Add error details and retry logic for webhook failures.
- Load webhook URL from a config file or environment variable.
- Add a message history export or conversation persistence.
