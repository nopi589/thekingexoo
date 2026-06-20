// ============================
// Auth guard — redirect to sign in if not logged in
// ============================
let currentUser = null;

(async function checkAuth() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = 'signin.html';
    return;
  }
  currentUser = data.session.user;
  const userEmailEl = document.getElementById('userEmail');
  if (userEmailEl) userEmailEl.textContent = currentUser.email;

  await loadConversations();
})();

// Keep things in sync if the session changes in another tab (e.g. sign out)
supabaseClient.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    window.location.href = 'signin.html';
  }
});

document.getElementById('signOutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = 'signin.html';
});

// ============================
// State
// ============================
let conversation = [];          // [{role, content, attachments}] sent to /api/chat
let isStreaming = false;
let selectedModel = 'sonnet';
let pendingFiles = [];          // [{name, mimeType, dataUrl/text, kind: 'image'|'pdf'|'text'}]
let currentConversationId = null;
let conversationsCache = [];    // [{id, title, updated_at}]

const chatWindow = document.getElementById('chatWindow');
const chatEmpty = document.getElementById('chatEmpty');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const newChatBtn = document.getElementById('newChatBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const chatAttachments = document.getElementById('chatAttachments');
const modelSelectWrap = document.querySelector('.model-select-wrap');
const modelSelectBtn = document.getElementById('modelSelectBtn');
const modelSelectLabel = document.getElementById('modelSelectLabel');
const modelDropdown = document.getElementById('modelDropdown');
const sidebar = document.getElementById('sidebar');
const sidebarList = document.getElementById('sidebarList');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const chatCurrentTitle = document.getElementById('chatCurrentTitle');

const MODEL_LABELS = { opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku' };

// ============================
// Sidebar open/close (mobile drawer)
// ============================
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
}
sidebarToggle.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

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
// Model selector dropdown
// ============================
modelSelectBtn.addEventListener('click', () => {
  const isOpen = modelSelectWrap.classList.toggle('open');
  modelSelectBtn.setAttribute('aria-expanded', isOpen);
});

document.querySelectorAll('.model-option').forEach(opt => {
  opt.addEventListener('click', () => {
    selectedModel = opt.dataset.model;
    modelSelectLabel.textContent = MODEL_LABELS[selectedModel];
    document.querySelectorAll('.model-option').forEach(o => {
      o.classList.remove('selected');
      o.removeAttribute('aria-selected');
    });
    opt.classList.add('selected');
    opt.setAttribute('aria-selected', 'true');
    modelSelectWrap.classList.remove('open');
    modelSelectBtn.setAttribute('aria-expanded', 'false');
  });
});

document.addEventListener('click', (e) => {
  if (!modelSelectWrap.contains(e.target)) {
    modelSelectWrap.classList.remove('open');
    modelSelectBtn.setAttribute('aria-expanded', 'false');
  }
});

// ============================
// File upload
// ============================
attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  for (const file of files) {
    await addFile(file);
  }
  fileInput.value = '';
});

async function addFile(file) {
  const MAX_SIZE = 15 * 1024 * 1024; // 15MB
  if (file.size > MAX_SIZE) {
    alert(`"${file.name}" is too large (max 15MB).`);
    return;
  }

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  const isTxt = file.type === 'text/plain' || file.name.endsWith('.txt');
  const isDocx = file.name.endsWith('.docx');

  const entry = { name: file.name, kind: null, mimeType: file.type };

  try {
    if (isImage) {
      entry.kind = 'image';
      entry.dataUrl = await readAsDataURL(file);
    } else if (isPdf) {
      entry.kind = 'pdf';
      entry.dataUrl = await readAsDataURL(file);
    } else if (isTxt) {
      entry.kind = 'text';
      entry.text = await readAsText(file);
    } else if (isDocx) {
      // Plain-text fallback: docx is a zip archive, so without a parsing
      // library this just sends the filename as context rather than contents.
      entry.kind = 'text';
      entry.text = `[Attached .docx file: ${file.name} — content extraction for .docx isn't supported client-side; consider exporting to .txt or .pdf for full content.]`;
    } else {
      alert(`"${file.name}" is not a supported file type.`);
      return;
    }
  } catch (err) {
    alert(`Couldn't read "${file.name}".`);
    return;
  }

  pendingFiles.push(entry);
  renderAttachments();
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function renderAttachments() {
  chatAttachments.innerHTML = '';
  pendingFiles.forEach((f, i) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';

    if (f.kind === 'image') {
      const img = document.createElement('img');
      img.src = f.dataUrl;
      chip.appendChild(img);
    } else {
      const icon = document.createElement('span');
      icon.className = 'file-icon';
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      chip.appendChild(icon);
    }

    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = f.name;
    chip.appendChild(name);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'attachment-remove';
    remove.setAttribute('aria-label', `Remove ${f.name}`);
    remove.textContent = '✕';
    remove.addEventListener('click', () => {
      pendingFiles.splice(i, 1);
      renderAttachments();
    });
    chip.appendChild(remove);

    chatAttachments.appendChild(chip);
  });
}

// ============================
// Conversations: load list, render sidebar
// ============================
async function loadConversations() {
  try {
    const { data, error } = await supabaseClient
      .from('conversations')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    conversationsCache = data || [];
    renderSidebar();
  } catch (err) {
    console.error('Failed to load conversations:', err.message);
  }
}

function renderSidebar() {
  sidebarList.innerHTML = '';

  if (conversationsCache.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'sidebar-empty-hint';
    hint.textContent = 'No conversations yet';
    sidebarList.appendChild(hint);
    return;
  }

  conversationsCache.forEach(conv => {
    const item = document.createElement('div');
    item.className = 'conv-item' + (conv.id === currentConversationId ? ' active' : '');

    const title = document.createElement('span');
    title.className = 'conv-item-title';
    title.textContent = conv.title || 'New chat';
    item.appendChild(title);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'conv-item-delete';
    del.setAttribute('aria-label', 'Delete conversation');
    del.textContent = '✕';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });
    item.appendChild(del);

    item.addEventListener('click', () => selectConversation(conv.id));
    sidebarList.appendChild(item);
  });
}

async function deleteConversation(id) {
  if (!confirm('Delete this conversation? This can\'t be undone.')) return;

  try {
    const { error } = await supabaseClient.from('conversations').delete().eq('id', id);
    if (error) throw error;

    conversationsCache = conversationsCache.filter(c => c.id !== id);
    renderSidebar();

    if (id === currentConversationId) {
      startNewChatUI();
    }
  } catch (err) {
    alert('Could not delete conversation: ' + err.message);
  }
}

async function selectConversation(id) {
  if (id === currentConversationId) return;
  closeSidebar();

  try {
    const { data, error } = await supabaseClient
      .from('messages')
      .select('role, content')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    currentConversationId = id;
    conversation = (data || []).map(m => ({ role: m.role, content: m.content }));

    renderFullConversation();
    renderSidebar();

    const conv = conversationsCache.find(c => c.id === id);
    chatCurrentTitle.textContent = conv ? conv.title : 'Chat';

  } catch (err) {
    alert('Could not load that conversation: ' + err.message);
  }
}

function renderFullConversation() {
  document.querySelectorAll('.msg-row').forEach(el => el.remove());
  if (chatEmpty) chatEmpty.style.display = 'none';

  conversation.forEach(msg => {
    if (msg.role === 'user') {
      addUserMessage(msg.content, []);
    } else {
      const row = document.createElement('div');
      row.className = 'msg-row assistant';
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.textContent = msg.content;
      row.appendChild(bubble);
      chatWindow.appendChild(row);
    }
  });
  scrollToBottom();
}

async function createConversation(firstMessageText) {
  const title = (firstMessageText || 'New chat').slice(0, 60);

  const { data, error } = await supabaseClient
    .from('conversations')
    .insert({ user_id: currentUser.id, title })
    .select('id, title, updated_at')
    .single();

  if (error) throw error;

  conversationsCache.unshift(data);
  currentConversationId = data.id;
  chatCurrentTitle.textContent = data.title;
  renderSidebar();

  return data.id;
}

async function saveMessage(conversationId, role, content) {
  try {
    await supabaseClient.from('messages').insert({
      conversation_id: conversationId,
      role,
      content
    });
    await supabaseClient
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  } catch (err) {
    console.error('Failed to save message:', err.message);
  }
}

// ============================
// New chat
// ============================
function startNewChatUI() {
  conversation = [];
  currentConversationId = null;
  pendingFiles = [];
  renderAttachments();
  document.querySelectorAll('.msg-row').forEach(el => el.remove());
  if (!document.getElementById('chatEmpty')) {
    chatWindow.prepend(chatEmpty);
  }
  chatEmpty.style.display = 'flex';
  chatCurrentTitle.textContent = 'New chat';
  renderSidebar();
  chatInput.focus();
  closeSidebar();
}

newChatBtn.addEventListener('click', startNewChatUI);

// ============================
// Render helpers
// ============================
function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function addUserMessage(text, files) {
  const row = document.createElement('div');
  row.className = 'msg-row user';
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (files && files.length) {
    const preview = document.createElement('div');
    preview.style.display = 'flex';
    preview.style.gap = '6px';
    preview.style.marginBottom = text ? '8px' : '0';
    preview.style.flexWrap = 'wrap';
    files.forEach(f => {
      if (f.kind === 'image') {
        const img = document.createElement('img');
        img.src = f.dataUrl;
        img.style.width = '56px';
        img.style.height = '56px';
        img.style.borderRadius = '8px';
        img.style.objectFit = 'cover';
        preview.appendChild(img);
      } else {
        const tag = document.createElement('span');
        tag.className = 'mono';
        tag.style.fontSize = '11px';
        tag.style.opacity = '0.8';
        tag.textContent = `📎 ${f.name}`;
        preview.appendChild(tag);
      }
    });
    bubble.appendChild(preview);
  }

  if (text) {
    const textNode = document.createElement('div');
    textNode.textContent = text;
    bubble.appendChild(textNode);
  }

  row.appendChild(bubble);
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
  const hasFiles = pendingFiles.length > 0;
  if (!text.trim() && !hasFiles) return;
  if (isStreaming) return;

  if (chatEmpty && chatEmpty.parentNode) {
    chatEmpty.style.display = 'none';
  }

  const filesToSend = pendingFiles;
  addUserMessage(text, filesToSend);

  // Build the content sent to the backend: text plus any attachments.
  conversation.push({
    role: 'user',
    content: text,
    attachments: filesToSend.map(f => ({
      name: f.name,
      kind: f.kind,
      mimeType: f.mimeType,
      dataUrl: f.dataUrl,
      text: f.text
    }))
  });

  chatInput.value = '';
  pendingFiles = [];
  renderAttachments();
  isStreaming = true;
  chatSend.disabled = true;

  const bubble = addAssistantPlaceholder();

  try {
    // Create the conversation row on the first message of a new chat.
    if (!currentConversationId) {
      currentConversationId = await createConversation(text || filesToSend[0]?.name);
    }
    await saveMessage(currentConversationId, 'user', text);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversation, model: selectedModel })
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
    await saveMessage(currentConversationId, 'assistant', answer);

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
