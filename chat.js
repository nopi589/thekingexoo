// ============================
// State
// ============================
let conversation = [];
let isStreaming = false;

const chatWindow = document.getElementById('chatWindow');
const chatEmpty = document.getElementById('chatEmpty');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const newChatBtn = document.getElementById('newChatBtn');

// ============================
// Suggestion chips
// ============================
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    chatInput.value = chip.dataset.q;
    chatForm.requestSubmit();
  });
});

// ============================
// New chat
// ============================
newChatBtn.addEventListener('click', () => {
  conversation = [];
  document.querySelectorAll('.msg-row').forEach(el => el.remove());
  if (!document.getElementById('chatEmpty')) {
    chatWindow.prepend(chatEmpty);
  }
  chatEmpty.style.display = 'flex';
  chatInput.focus();
});

// ============================
// Render helpers
// ============================
function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function addUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `<div class="msg-bubble"></div>`;
  row.querySelector('.msg-bubble').textContent = text;
  chatWindow.appendChild(row);
  scrollToBottom();
}

function addAssistantPlaceholder() {
  const row = document.createElement('div');
  row.className = 'msg-row assistant';
  row.innerHTML = `<div class="msg-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>`;
  chatWindow.appendChild(row);
  scrollToBottom();
  return row.querySelector('.msg-bubble');
}

// ============================
// Send message
// ============================
async function sendMessage(text) {
  if (!text.trim() || isStreaming) return;

  if (chatEmpty && chatEmpty.parentNode) {
    chatEmpty.style.display = 'none';
  }

  addUserMessage(text);
  conversation.push({ role: 'user', content: text });

  chatInput.value = '';
  isStreaming = true;
  chatSend.disabled = true;

  const bubble = addAssistantPlaceholder();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversation })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    const textBlocks = (data.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    const answer = textBlocks || "I couldn't generate a response that time — try asking again.";

    bubble.innerHTML = '';
    typeOut(bubble, answer);

    conversation.push({ role: 'assistant', content: answer });

  } catch (err) {
    bubble.classList.add('error');
    bubble.textContent = "Something went wrong reaching Exoo. Check your connection and try again.";
  } finally {
    isStreaming = false;
    chatSend.disabled = false;
    chatInput.focus();
  }
}

// ============================
// Typing effect for assistant reply
// ============================
function typeOut(el, text) {
  let i = 0;
  const speed = 8;
  function step() {
    if (i <= text.length) {
      el.innerHTML = escapeHtml(text.slice(0, i)) + '<span class="msg-cursor"></span>';
      i += 2;
      scrollToBottom();
      setTimeout(step, speed);
    } else {
      el.innerHTML = escapeHtml(text);
      scrollToBottom();
    }
  }
  step();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================
// Form submit
// ============================
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage(chatInput.value);
});

chatInput.focus();
