const API_URL = '/api/chat';
const SESSION_KEY = 'chesschat_session_id';

const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const chatWindow = document.getElementById('chatWindow');
const emptyState = document.getElementById('emptyState');

const suggestionButtons = document.querySelectorAll('.suggestion-chip');
let isSending = false;
let typingIndicator = null;

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `session_${crypto.randomUUID()}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function createBubble(role, text) {
  const bubble = document.createElement('section');
  bubble.className = 'message ' + (role === 'user' ? 'user' : 'ai');
  bubble.innerHTML = `
    <div class="message-role">${role === 'user' ? 'You' : 'Assistant'}</div>
    <p class="message-text"></p>
  `;
  bubble.querySelector('.message-text').textContent = text;
  return bubble;
}

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setLoadingState(active) {
  isSending = active;
  sendButton.disabled = active || !chatInput.value.trim();
  sendButton.textContent = active ? 'Sending…' : 'Send message';
}

function showTypingIndicator() {
  removeTypingIndicator();
  typingIndicator = createBubble('ai', '…');
  typingIndicator.classList.add('typing-indicator');
  chatWindow.appendChild(typingIndicator);
  scrollToBottom();
}

function removeTypingIndicator() {
  if (typingIndicator) {
    typingIndicator.remove();
    typingIndicator = null;
  }
}

function showError(message) {
  const errorBubble = createBubble('ai', message);
  errorBubble.classList.add('message-error');
  chatWindow.appendChild(errorBubble);
  scrollToBottom();
}

function extractReply(payload) {
  if (!payload || typeof payload !== 'object') {
    return typeof payload === 'string' ? payload : null;
  }

  const candidates = [
    payload.output,
    payload.text,
    payload.answer,
    payload.response,
    typeof payload.message === 'string' ? payload.message : null,
    payload.data?.output,
    payload.data?.text,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  if (Array.isArray(payload)) {
    return extractReply(payload[0]?.json ?? payload[0]);
  }

  return null;
}

function friendlyError(error, responsePayload) {
  if (responsePayload?.error) {
    return responsePayload.error;
  }

  const message = error?.message || '';

  if (message === 'Failed to fetch') {
    if (window.location.protocol === 'file:') {
      return 'This page was opened as a file. Run `npm start` in the project folder, then open http://localhost:3000.';
    }
    return 'Cannot reach the chat server. Run `npm start` in the project folder and use http://localhost:3000.';
  }

  return message || 'Check your webhook URL and network connection.';
}

async function sendMessage(text) {
  if (!text.trim() || isSending) return;

  if (emptyState) {
    emptyState.remove();
  }

  const userBubble = createBubble('user', text.trim());
  chatWindow.appendChild(userBubble);
  scrollToBottom();
  setLoadingState(true);
  showTypingIndicator();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: text.trim(),
        sessionId: getSessionId(),
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(friendlyError(null, payload));
    }

    const reply =
      extractReply(payload) ||
      'The assistant responded, but no text was found. Check the n8n workflow output format.';

    removeTypingIndicator();
    const assistantBubble = createBubble('ai', reply);
    chatWindow.appendChild(assistantBubble);
  } catch (error) {
    console.error(error);
    removeTypingIndicator();
    showError(`Unable to send message. ${friendlyError(error)}`);
  } finally {
    setLoadingState(false);
    chatInput.value = '';
    chatInput.focus();
    scrollToBottom();
  }
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = chatInput.value;
  if (message.trim()) {
    sendMessage(message);
  }
});

chatInput.addEventListener('input', () => {
  sendButton.disabled = isSending || !chatInput.value.trim();
});

chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (chatInput.value.trim() && !isSending) {
      sendMessage(chatInput.value);
    }
  }
});

suggestionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const message = button.dataset.message;
    if (message) {
      chatInput.value = message;
      sendMessage(message);
    }
  });
});

window.addEventListener('load', () => {
  if (window.location.protocol === 'file:') {
    showError(
      'Opened as a local file — the webhook cannot be called from here. Run `npm start` and open http://localhost:3000 instead.'
    );
  }
  chatInput.focus();
});
