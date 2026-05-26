// CHESS MASTER AI CLIENT-SIDE CONTROLLER ENGINE

const WEBHOOK_URL = "https://dax1208.app.n8n.cloud/webhook/chess-chatbot-webhook-001/chat";
let allChats = [];
let activeChatId = null;
let isWaitingForResponse = false;
let currentProfile = { username: 'Player', profile_picture: '' };

const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const openSidebarBtn = document.getElementById('openSidebarBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const newChatBtn = document.getElementById('newChatBtn');
const mobileNewChatBtn = document.getElementById('mobileNewChatBtn');
const historyList = document.getElementById('historyList');
const chatContainer = document.getElementById('chatContainer');
const emptyState = document.getElementById('emptyState');
const messagesLog = document.getElementById('messagesLog');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

function checkResponsiveLayout() {
    if (window.innerWidth <= 768) {
        if (closeSidebarBtn) closeSidebarBtn.style.display = 'flex';
    } else {
        if (closeSidebarBtn) closeSidebarBtn.style.display = 'none';
        if (sidebar) sidebar.classList.remove('open');
    }
}

function toggleMobileSidebar() {
    if (sidebar) sidebar.classList.toggle('open');
}

function handleTextareaAutogrow() {
    chatInput.style.height = 'auto';
    const computedHeight = chatInput.scrollHeight;
    chatInput.style.height = Math.min(computedHeight, 150) + 'px';
    const hasText = chatInput.value.trim().length > 0;
    sendBtn.disabled = !hasText || isWaitingForResponse;
}

function handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (chatInput.value.trim().length > 0 && !isWaitingForResponse) {
            submitUserMessage();
        }
    }
}

function sendSuggestedQuestion(cardElement) {
    if (isWaitingForResponse) return;
    const questionText = cardElement.querySelector('.suggestion-text').textContent;
    chatInput.value = questionText;
    handleTextareaAutogrow();
    submitUserMessage();
}

function updateSessionStorage() {
    localStorage.setItem('chess_chats_history', JSON.stringify(allChats));
    if (activeChatId) {
        localStorage.setItem('chess_active_chat_id', activeChatId);
    }
}

function formatCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
}

function formatHistoryTimestamp(value) {
    if (!value) {
        return 'Now';
    }

    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
        return 'Just now';
    }

    return dateValue.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getAvatarInitials(name) {
    const fallbackName = (name || 'Player').trim();
    if (!fallbackName) {
        return 'PL';
    }

    const parts = fallbackName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fallbackName.slice(0, 2).toUpperCase();
}

function normalizeProfilePicturePath(path) {
    if (!path) {
        return '';
    }

    if (/^(https?:|data:)/i.test(path) || path.startsWith('../')) {
        return path;
    }

    if (path.startsWith('uploads/')) {
        return '../' + path;
    }

    return path;
}

function getSessionTitle(message) {
    const cleaned = message.trim().replace(/\s+/g, ' ');
    if (!cleaned) return 'New conversation';
    return cleaned.length > 36 ? cleaned.slice(0, 36) + '…' : cleaned;
}

function normalizeSessionPayload(session) {
    return {
        id: session.session_id || session.id,
        title: session.title || 'New conversation',
        share_token: session.share_token || null,
        messages: (session.messages || []).map(message => ({
            role: message.role,
            text: message.message || message.text || '',
            timestamp: message.timestamp || formatHistoryTimestamp(message.created_at)
        }))
    };
}

function applyProfileData(data) {
    const username = data.username || 'Player';
    const profilePicture = normalizeProfilePicturePath(data.profile_picture || '');

    currentProfile = {
        username,
        profile_picture: profilePicture
    };

    const headerUsername = document.getElementById('headerUsername');
    const footerUsername = document.getElementById('footerUsername');
    const headerAvatar = document.getElementById('headerAvatarBtn');
    const footerAvatar = document.getElementById('footerAvatar');
    const profilePreviewName = document.getElementById('profilePreviewName');

    if (headerUsername) headerUsername.textContent = username;
    if (footerUsername) footerUsername.textContent = username;
    if (profilePreviewName) profilePreviewName.textContent = username;

    if (headerAvatar) {
        headerAvatar.innerHTML = '';
        if (currentProfile.profile_picture) {
            const image = document.createElement('img');
            image.src = currentProfile.profile_picture;
            image.alt = username;
            image.className = 'avatar-image';
            headerAvatar.appendChild(image);
        } else {
            headerAvatar.textContent = getAvatarInitials(username);
        }
    }

    if (footerAvatar) {
        footerAvatar.innerHTML = '';
        if (currentProfile.profile_picture) {
            const image = document.createElement('img');
            image.src = currentProfile.profile_picture;
            image.alt = username;
            image.className = 'avatar-image';
            footerAvatar.appendChild(image);
        } else {
            footerAvatar.textContent = getAvatarInitials(username);
        }
    }
}

function setProfilePreview() {
    const preview = document.getElementById('profilePreview');
    const fileInput = document.getElementById('profileImageInput');
    if (!preview) return;

    if (fileInput && fileInput.files && fileInput.files[0]) {
        preview.src = URL.createObjectURL(fileInput.files[0]);
        preview.style.display = 'block';
        return;
    }

    preview.removeAttribute('src');
    const normalizedPicture = normalizeProfilePicturePath(currentProfile.profile_picture);
    preview.style.display = normalizedPicture ? 'block' : 'none';
    if (normalizedPicture) {
        preview.src = normalizedPicture;
    }
}

function openProfileModal() {
    const modal = document.getElementById('profileModal');
    const displayName = document.getElementById('displayName');
    const message = document.getElementById('profileMessage');
    const preview = document.getElementById('profilePreview');

    if (!modal) return;

    if (displayName) displayName.value = currentProfile.username;
    if (message) message.textContent = '';
    if (preview) {
        preview.removeAttribute('src');
        preview.style.display = normalizeProfilePicturePath(currentProfile.profile_picture) ? 'block' : 'none';
        if (normalizeProfilePicturePath(currentProfile.profile_picture)) {
            preview.src = normalizeProfilePicturePath(currentProfile.profile_picture);
        }
    }
    setProfilePreview();
    modal.classList.remove('hidden');
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    const input = document.getElementById('profileImageInput');
    if (modal) modal.classList.add('hidden');
    if (input) input.value = '';
    setProfilePreview();
}

function showProfileMessage(message, isError = false) {
    const element = document.getElementById('profileMessage');
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? 'var(--danger-color)' : 'var(--accent-gold)';
}

function renderHistoryList() {
    historyList.innerHTML = '';

    if (allChats.length === 0) {
        const emptyHistory = document.createElement('div');
        emptyHistory.style.fontSize = '0.78rem';
        emptyHistory.style.color = 'var(--text-muted)';
        emptyHistory.style.padding = '1rem 0.5rem';
        emptyHistory.style.textAlign = 'center';
        emptyHistory.style.fontStyle = 'italic';
        emptyHistory.innerText = 'No recent sessions';
        historyList.appendChild(emptyHistory);
        return;
    }

    allChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `history-item ${chat.id === activeChatId ? 'active' : ''}`;
        item.setAttribute('data-id', chat.id);
        item.onclick = (event) => {
            if (event.target.closest('.history-action-btn')) return;
            loadChatSession(chat.id);
            if (window.innerWidth <= 768) toggleMobileSidebar();
        };

        const titleWrap = document.createElement('div');
        titleWrap.className = 'history-title-wrap';

        const icon = document.createElement('i');
        icon.className = 'history-icon';
        icon.setAttribute('data-lucide', 'message-square');
        icon.style.width = '14px';
        icon.style.height = '14px';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'history-title';
        titleSpan.innerText = chat.title || 'New conversation';

        titleWrap.appendChild(icon);
        titleWrap.appendChild(titleSpan);

        const actions = document.createElement('div');
        actions.className = 'history-actions';

        const renameBtn = document.createElement('button');
        renameBtn.className = 'history-action-btn';
        renameBtn.type = 'button';
        renameBtn.title = 'Rename conversation';
        renameBtn.innerHTML = '<i data-lucide="edit-3" style="width: 13px; height: 13px;"></i>';
        renameBtn.onclick = async (event) => {
            event.stopPropagation();
            await renameChatSession(chat.id, chat.title);
        };

        const shareBtn = document.createElement('button');
        shareBtn.className = 'history-action-btn';
        shareBtn.type = 'button';
        shareBtn.title = 'Share conversation';
        shareBtn.innerHTML = '<i data-lucide="share-2" style="width: 13px; height: 13px;"></i>';
        shareBtn.onclick = async (event) => {
            event.stopPropagation();
            await shareChatSession(chat.id);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'history-action-btn delete-history-btn';
        deleteBtn.type = 'button';
        deleteBtn.title = 'Delete permanently';
        deleteBtn.innerHTML = '<i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>';
        deleteBtn.onclick = async (event) => {
            event.stopPropagation();
            await deleteChatSession(chat.id);
        };

        actions.appendChild(renameBtn);
        actions.appendChild(shareBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(titleWrap);
        item.appendChild(actions);
        historyList.appendChild(item);
    });

    lucide.createIcons();
}

function startNewChatSession() {
    if (isWaitingForResponse) return;
    activeChatId = null;
    messagesLog.innerHTML = '';
    emptyState.style.display = 'flex';
    document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
    chatInput.value = '';
    chatInput.focus();
    handleTextareaAutogrow();
    localStorage.removeItem('chess_active_chat_id');
}

function loadChatSession(chatId) {
    if (isWaitingForResponse) return;
    const chat = allChats.find(session => session.id === chatId);
    if (!chat) return;

    activeChatId = chatId;
    localStorage.setItem('chess_active_chat_id', chatId);
    renderHistoryList();
    messagesLog.innerHTML = '';
    emptyState.style.display = 'none';

    chat.messages.forEach(message => {
        appendMessageToUI(message.role === 'bot' ? 'bot' : 'user', message.text, message.timestamp, false);
    });

    scrollChatToBottom();
    chatInput.focus();
}

async function saveChat(sessionId, role, message) {
    const response = await fetch('../backend/api/save_chat.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, role, message })
    });

    if (!response.ok) {
        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }
        throw new Error('Unable to save chat');
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Unable to save chat');
}

function scrollChatToBottom() {
    if (!messagesLog) return;
    messagesLog.scrollTop = messagesLog.scrollHeight;
}

function appendMessageToUI(role, text, timestamp, persist = true) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'bot' ? '♟' : '♔';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const content = document.createElement('div');
    content.className = 'message-content';
    if (window.marked) {
        content.innerHTML = marked.parse(String(text || ''));
    } else {
        content.textContent = String(text || '');
    }

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    meta.textContent = timestamp || formatCurrentTime();

    if (role === 'bot') {
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'copy-message-btn';
        copyBtn.title = 'Copy response';
        copyBtn.innerHTML = '<i data-lucide="copy" style="width: 14px; height: 14px;"></i>';
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(String(text || ''));
            } catch (error) {
                console.warn('Unable to copy message');
            }
        };

        bubble.appendChild(copyBtn);
    }

    bubble.appendChild(content);
    bubble.appendChild(meta);
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    row.appendChild(wrapper);
    messagesLog.appendChild(row);

    lucide.createIcons();
}

async function sendBotResponse(userText) {
    const typingRow = createTypingIndicator();
    messagesLog.appendChild(typingRow);
    scrollChatToBottom();

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatInput: userText, sessionId: activeChatId })
        });

        if (!response.ok) throw new Error(`Webhook returned ${response.status}`);

        const payload = await response.json();
        removeTypingIndicator();
        const botReply = payload.output ?? payload.data?.output ?? '';
        if (!botReply) throw new Error('Invalid webhook response');

        const botTimestamp = formatCurrentTime();
        appendMessageToUI('bot', botReply, botTimestamp, true);
        const activeSession = allChats.find(session => session.id === activeChatId);
        if (activeSession) {
            activeSession.messages.push({ role: 'bot', text: botReply, timestamp: botTimestamp });
            updateSessionStorage();
        }

        await saveChat(activeChatId, 'bot', botReply);
        scrollChatToBottom();
    } catch (error) {
        removeTypingIndicator();
        throw error;
    }
}

function createTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row bot';
    row.id = 'typingIndicatorRow';

    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '♟';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.style.padding = '0.75rem 1.25rem';

    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

    bubble.appendChild(typingIndicator);
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    row.appendChild(wrapper);
    return row;
}

function removeTypingIndicator() {
    const element = document.getElementById('typingIndicatorRow');
    if (element) element.remove();
}

async function submitUserMessage(retryText = null) {
    const text = retryText || chatInput.value.trim();
    if (!text || isWaitingForResponse) return;

    if (!retryText) {
        chatInput.value = '';
        handleTextareaAutogrow();
    }

    const timestamp = formatCurrentTime();
    emptyState.style.display = 'none';
    appendMessageToUI('user', text, timestamp, true);
    scrollChatToBottom();

    isWaitingForResponse = true;
    chatInput.disabled = true;
    sendBtn.disabled = true;

    if (!activeChatId) {
        const newId = 'session_' + Date.now();
        const title = getSessionTitle(text);
        allChats.unshift({ id: newId, title, messages: [{ role: 'user', text, timestamp }] });
        activeChatId = newId;
        updateSessionStorage();
        renderHistoryList();
    } else {
        const activeSession = allChats.find(session => session.id === activeChatId);
        if (activeSession) {
            activeSession.messages.push({ role: 'user', text, timestamp });
            if (!activeSession.title) activeSession.title = getSessionTitle(text);
            updateSessionStorage();
        }
    }

    try {
        await saveChat(activeChatId, 'user', text);
        await sendBotResponse(text);
    } catch (error) {
        console.error(error);
        appendErrorCard(text);
    } finally {
        isWaitingForResponse = false;
        chatInput.disabled = false;
        chatInput.focus();
        handleTextareaAutogrow();
    }
}

function appendErrorCard(originalText) {
    const row = document.createElement('div');
    row.className = 'message-row bot';

    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';
    wrapper.style.width = '100%';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '♟';

    const card = document.createElement('div');
    card.className = 'error-card';

    const header = document.createElement('div');
    header.className = 'error-header';
    header.innerHTML = '<i data-lucide="alert-triangle" style="width: 18px; height: 18px;"></i><span>Connection issue</span>';

    const body = document.createElement('div');
    body.className = 'error-body';
    body.textContent = 'Unable to connect to the AI service. Please try again.';

    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn';
    retryBtn.innerHTML = '<i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i><span>Retry Message</span>';
    retryBtn.onclick = () => {
        row.remove();
        submitUserMessage(originalText);
    };

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(retryBtn);
    wrapper.appendChild(avatar);
    wrapper.appendChild(card);
    row.appendChild(wrapper);
    messagesLog.appendChild(row);
    lucide.createIcons();
}

async function renameChatSession(chatId, currentTitle) {
    const nextTitle = window.prompt('Rename conversation', currentTitle || 'New conversation');
    if (nextTitle === null) return;

    const trimmedTitle = nextTitle.trim();
    if (!trimmedTitle) {
        alert('Please enter a title for this conversation.');
        return;
    }

    try {
        const response = await fetch('../backend/api/rename_chat.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: chatId, title: trimmedTitle })
        });

        const data = await response.json();
        if (!data.success) {
            alert(data.message || 'Unable to rename conversation.');
            return;
        }

        const chat = allChats.find(session => session.id === chatId);
        if (chat) chat.title = trimmedTitle;
        renderHistoryList();
    } catch (error) {
        alert('Unable to rename conversation right now.');
    }
}

async function shareChatSession(chatId) {
    try {
        const response = await fetch('../backend/api/share_chat.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: chatId })
        });

        const data = await response.json();
        if (!data.success) {
            alert(data.message || 'Unable to share conversation.');
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(data.share_url);
            alert('Share link copied to clipboard.');
        } else {
            window.prompt('Copy this share link:', data.share_url);
        }
    } catch (error) {
        alert('Unable to share conversation right now.');
    }
}

async function deleteChatSession(chatId) {
    if (isWaitingForResponse && activeChatId === chatId) return;

    const confirmed = window.confirm('Delete this conversation permanently?');
    if (!confirmed) return;

    try {
        const response = await fetch('../backend/api/delete_chat.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: chatId })
        });

        const data = await response.json();
        if (!data.success) {
            alert(data.message || 'Unable to delete conversation.');
            return;
        }

        if (activeChatId === chatId) {
            activeChatId = null;
            localStorage.removeItem('chess_active_chat_id');
        }

        await loadInitialChats();
    } catch (error) {
        alert('Unable to delete conversation right now.');
    }
}

async function saveProfile() {
    const displayName = document.getElementById('displayName');
    const fileInput = document.getElementById('profileImageInput');

    if (!displayName) return;

    const formData = new FormData();
    const nextName = displayName.value.trim();
    if (nextName) {
        formData.append('username', nextName);
    }
    if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('profile_picture', fileInput.files[0]);
    }

    try {
        const response = await fetch('../backend/api/profile.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!data.success) {
            showProfileMessage(data.message || 'Unable to update profile.', true);
            return;
        }

        applyProfileData(data);
        closeProfileModal();
        showProfileMessage('Profile updated successfully.');
        await loadInitialChats();
    } catch (error) {
        showProfileMessage('Unable to update profile right now.', true);
    }
}

async function loadInitialChats() {
    try {
        const response = await fetch('../backend/api/get_chats.php');
        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();
        if (!data.success) {
            window.location.href = 'login.html';
            return;
        }

        applyProfileData(data);
        allChats = (data.sessions || []).map(normalizeSessionPayload);
        updateSessionStorage();
        renderHistoryList();

        const restoredSessionId = localStorage.getItem('chess_active_chat_id');
        if (restoredSessionId && allChats.some(session => session.id === restoredSessionId)) {
            loadChatSession(restoredSessionId);
        } else if (allChats.length > 0) {
            loadChatSession(allChats[0].id);
        } else {
            startNewChatSession();
        }
    } catch (error) {
        console.error('Unable to initialize chat:', error);
        window.location.href = 'login.html';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    checkResponsiveLayout();
    window.addEventListener('resize', checkResponsiveLayout);

    if (!chatContainer) return;

    lucide.createIcons();
    chatInput.addEventListener('input', handleTextareaAutogrow);
    chatInput.addEventListener('keydown', handleKeydown);
    sendBtn.addEventListener('click', () => submitUserMessage());
    newChatBtn.addEventListener('click', startNewChatSession);
    mobileNewChatBtn.addEventListener('click', startNewChatSession);
    openSidebarBtn.addEventListener('click', toggleMobileSidebar);
    closeSidebarBtn.addEventListener('click', toggleMobileSidebar);
    sidebarBackdrop.addEventListener('click', toggleMobileSidebar);
    document.getElementById('logoutBtn').addEventListener('click', () => window.location.href = '../backend/api/logout.php');
    document.getElementById('headerAvatarBtn').addEventListener('click', openProfileModal);
    document.getElementById('profileEditBtn').addEventListener('click', openProfileModal);
    document.getElementById('closeProfileModal').addEventListener('click', closeProfileModal);
    document.getElementById('cancelProfileBtn').addEventListener('click', closeProfileModal);
    document.getElementById('profileUploadBtn').addEventListener('click', () => document.getElementById('profileImageInput').click());
    document.getElementById('profileImageInput').addEventListener('change', setProfilePreview);
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);

    loadInitialChats();
});
