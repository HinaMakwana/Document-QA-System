/**
 * Chat functionality
 */
class ChatManager {
    constructor() {
        this.conversationId = null;
        this.selectedDocuments = new Set();
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDocuments();
        window.addEventListener('auth:login', () => this.loadDocuments());
    }

    bindEvents() {
        const form = document.getElementById('chatForm');
        const input = document.getElementById('messageInput');
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');
        const newChatBtn = document.getElementById('newChatBtn');
        const clearChatBtn = document.getElementById('clearChatBtn');
        const toggleDocs = document.getElementById('toggleDocs');
        const quickUpload = document.getElementById('quickUpload');

        if (form) form.addEventListener('submit', (e) => this.sendMessage(e));
        if (input) input.addEventListener('input', () => this.autoResize(input));
        if (uploadBtn) uploadBtn.addEventListener('click', () => fileInput?.click());
        if (fileInput) fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        if (newChatBtn) newChatBtn.addEventListener('click', () => this.newChat());
        if (clearChatBtn) clearChatBtn.addEventListener('click', () => this.clearChat());
        if (toggleDocs) toggleDocs.addEventListener('click', () => this.toggleDocsPanel());
        if (quickUpload) quickUpload.addEventListener('click', () => fileInput?.click());

        this.setupUploadZone();
    }

    autoResize(el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }

    async loadDocuments() {
        const list = document.getElementById('documentsList');
        if (!list) return;
        try {
            const res = await api.getDocuments();
            const docs = res.results || res.data || [];
            if (docs.length === 0) {
                list.innerHTML = '<div class="loading-placeholder"><i class="fas fa-file-alt"></i><span>No documents yet</span></div>';
                return;
            }
            list.innerHTML = docs.map(doc => this.renderDocumentItem(doc)).join('');
            list.querySelectorAll('.document-item').forEach(item => {
                item.addEventListener('click', () => this.toggleDocument(item.dataset.id));
            });
        } catch (e) {
            list.innerHTML = '<div class="loading-placeholder"><span>Failed to load</span></div>';
        }
    }

    renderDocumentItem(doc) {
        const icons = { pdf: 'fa-file-pdf', docx: 'fa-file-word', txt: 'fa-file-alt' };
        return `<div class="document-item" data-id="${doc.id}">
            <div class="document-icon ${doc.file_type}"><i class="fas ${icons[doc.file_type] || 'fa-file'}"></i></div>
            <div class="document-info"><div class="document-title">${doc.title}</div><div class="document-meta">${doc.file_size_mb || 0} MB</div></div>
            <div class="document-status ${doc.status}"></div>
        </div>`;
    }

    toggleDocument(id) {
        const item = document.querySelector(`[data-id="${id}"]`);
        if (this.selectedDocuments.has(id)) {
            this.selectedDocuments.delete(id);
            item?.classList.remove('selected');
        } else {
            this.selectedDocuments.add(id);
            item?.classList.add('selected');
        }
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const el = document.getElementById('selectedDocsCount');
        if (el) el.textContent = `${this.selectedDocuments.size} documents selected`;
    }

    async sendMessage(e) {
        e.preventDefault();
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        if (!message) return;

        this.addMessage('user', message);
        input.value = '';
        this.autoResize(input);
        this.showTyping(true);
        document.getElementById('welcomeMessage')?.remove();

        try {
            let res;
            if (this.conversationId) {
                res = await api.sendMessage(this.conversationId, message, this.selectedDocuments.size > 0);
            } else {
                const docIds = Array.from(this.selectedDocuments);
                res = await api.quickQuestion(message, docIds);
                this.conversationId = res.data?.conversation_id;
            }
            this.showTyping(false);
            const msg = res.data?.message || res.message || {};
            this.addMessage('assistant', msg.content || 'No response', msg.citations);
        } catch (err) {
            this.showTyping(false);
            this.addMessage('assistant', 'Error: ' + err.message, [], true);
        }
    }

    addMessage(role, content, citations = [], isError = false) {
        const list = document.getElementById('messagesList');
        const container = document.getElementById('messagesContainer');
        if (!list) return;

        const citationBadge = citations?.length > 0 ?
            `<span class="citations-badge" onclick="showCitations(${JSON.stringify(citations).replace(/"/g, '&quot;')})"><i class="fas fa-quote-right"></i> ${citations.length} sources</span>` : '';

        list.innerHTML += `<div class="message ${role}">
            <div class="message-avatar"><i class="fas ${role === 'user' ? 'fa-user' : 'fa-robot'}"></i></div>
            <div class="message-content${isError ? ' error' : ''}">${this.parseContent(content)}
                ${citationBadge ? `<div class="message-meta">${citationBadge}</div>` : ''}
            </div>
        </div>`;
        container.scrollTop = container.scrollHeight;
    }

    parseContent(text) {
        return text.replace(/\n/g, '<br>').replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    showTyping(show) {
        const el = document.getElementById('typingIndicator');
        if (el) el.style.display = show ? 'flex' : 'none';
    }

    async handleFileUpload(e) {
        const files = e.target.files;
        for (const file of files) {
            try {
                showToast(`Uploading ${file.name}...`, 'info');
                await api.uploadDocument(file, file.name);
                showToast(`${file.name} uploaded!`, 'success');
            } catch (err) {
                showToast(`Failed: ${err.message}`, 'error');
            }
        }
        this.loadDocuments();
        e.target.value = '';
    }

    setupUploadZone() {
        const zone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        if (!zone) return;
        zone.addEventListener('click', () => fileInput?.click());
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            if (e.dataTransfer.files) { fileInput.files = e.dataTransfer.files; fileInput.dispatchEvent(new Event('change')); }
        });
    }

    newChat() {
        this.conversationId = null;
        document.getElementById('messagesList').innerHTML = '';
        document.getElementById('conversationTitle').textContent = 'New Conversation';
    }

    async clearChat() {
        if (!this.conversationId) { this.newChat(); return; }
        try {
            await api.clearConversation(this.conversationId);
            this.newChat();
            showToast('Chat cleared', 'success');
        } catch { showToast('Failed to clear', 'error'); }
    }

    toggleDocsPanel() {
        document.getElementById('documentsPanel')?.classList.toggle('hidden');
    }
}

function showCitations(citations) {
    const modal = document.getElementById('citationsModal');
    const list = document.getElementById('citationsList');
    if (!modal || !list) return;
    list.innerHTML = citations.map((c, i) =>
        `<div class="citation-item"><h4>Source ${i+1}: ${c.document_title || 'Document'}</h4><p>${c.content_preview || ''}</p><small>Score: ${(c.score*100).toFixed(1)}%</small></div>`
    ).join('');
    modal.classList.add('active');
}

function closeCitationsModal() { document.getElementById('citationsModal')?.classList.remove('active'); }
function closeUploadModal() { document.getElementById('uploadModal')?.classList.remove('active'); }

const chatManager = new ChatManager();
