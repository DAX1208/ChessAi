const WEBHOOK_URL = 'https://devangi.app.n8n.cloud/webhook/chess-chatbot-webhook-001';
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const chatWindow = document.getElementById('chatWindow');
const emptyState = document.getElementById('emptyState');

const suggestionButtons = document.querySelectorAll('.suggestion-chip');
let isSending = false;

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

function showError(message) {
  const errorBubble = createBubble('ai', message);
  errorBubble.style.borderColor = 'rgba(248,113,113,0.35)';
  errorBubble.style.background = 'rgba(248,113,113,0.1)';
  chatWindow.appendChild(errorBubble);
  scrollToBottom();
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

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: text.trim() })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response body');
      throw new Error(`Webhook returned ${response.status}: ${errorText}`);
    }

    const payload = await response.json().catch(() => null);
    const reply = payload?.answer || payload?.response || payload?.message || JSON.stringify(payload) || 'The webhook responded with no message.';

    const assistantBubble = createBubble('ai', reply);
    chatWindow.appendChild(assistantBubble);
  } catch (error) {
    console.error(error);
    showError('Unable to send message. Check your webhook URL and network connection.');
  } finally {
    setLoadingState(false);
    chatInput.value = '';
    chatInput.focus();
    scrollToBottom();
  }
}

chatForm.addEventListener('submit', event => {
  event.preventDefault();
  const message = chatInput.value;
  if (message.trim()) {
    sendMessage(message);
  }
});

chatInput.addEventListener('input', () => {
  sendButton.disabled = isSending || !chatInput.value.trim();
});

chatInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (chatInput.value.trim() && !isSending) {
      sendMessage(chatInput.value);
    }
  }
});

suggestionButtons.forEach(button => {
  button.addEventListener('click', () => {
    const message = button.dataset.message;
    if (message) {
      chatInput.value = message;
      sendMessage(message);
    }
  });
});

window.addEventListener('load', () => {
  chatInput.focus();
});
