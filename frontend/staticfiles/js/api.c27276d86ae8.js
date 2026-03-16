/**
 * API Client for AI Document Q&A System
 */
class APIClient {
    constructor() {
        this.baseURL = '/api/v1';
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
    }

    // Set tokens
    setTokens(access, refresh) {
        this.accessToken = access;
        this.refreshToken = refresh;
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
    }

    // Clear tokens
    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }

    // Check if authenticated
    isAuthenticated() {
        return !!this.accessToken;
    }

    // Get headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (includeAuth && this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        return headers;
    }

    // Refresh access token
    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch(`${this.baseURL}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: this.refreshToken }),
        });

        if (!response.ok) {
            this.clearTokens();
            throw new Error('Token refresh failed');
        }

        const data = await response.json();
        this.accessToken = data.access;
        localStorage.setItem('accessToken', data.access);
        return data.access;
    }

    // Make API request with auto-refresh
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

        let headers = this.getHeaders(options.auth !== false);
        if (options.formData) {
            delete headers['Content-Type'];
        }

        const config = {
            method: options.method || 'GET',
            headers: { ...headers, ...options.headers },
        };

        if (options.body) {
            config.body = options.formData ? options.body : JSON.stringify(options.body);
        }

        let response = await fetch(url, config);

        // Handle token expiration
        if (response.status === 401 && this.refreshToken) {
            try {
                await this.refreshAccessToken();
                config.headers['Authorization'] = `Bearer ${this.accessToken}`;
                response = await fetch(url, config);
            } catch (e) {
                this.clearTokens();
                window.dispatchEvent(new CustomEvent('auth:logout'));
                throw new Error('Session expired. Please login again.');
            }
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || data.detail || 'Request failed');
        }

        return data;
    }

    // Auth endpoints
    async register(email, password, passwordConfirm, firstName = '', lastName = '') {
        const data = await this.request('/auth/register/', {
            method: 'POST',
            auth: false,
            body: {
                email,
                password,
                password_confirm: passwordConfirm,
                first_name: firstName,
                last_name: lastName,
            },
        });

        if (data.data?.tokens) {
            this.setTokens(data.data.tokens.access, data.data.tokens.refresh);
        }
        return data;
    }

    async login(email, password) {
        const data = await this.request('/auth/login/', {
            method: 'POST',
            auth: false,
            body: { email, password },
        });

        this.setTokens(data.access, data.refresh);
        return data;
    }

    async logout() {
        try {
            await this.request('/auth/logout/', {
                method: 'POST',
                body: { refresh: this.refreshToken },
            });
        } finally {
            this.clearTokens();
        }
    }

    async getProfile() {
        return this.request('/auth/profile/');
    }

    async getUsage() {
        return this.request('/auth/usage/');
    }

    // Document endpoints
    async getDocuments() {
        return this.request('/documents/');
    }

    async getDocument(id) {
        return this.request(`/documents/${id}/`);
    }

    async uploadDocument(file, title = '', description = '') {
        const formData = new FormData();
        formData.append('file', file);
        if (title) formData.append('title', title);
        if (description) formData.append('description', description);

        return this.request('/documents/', {
            method: 'POST',
            body: formData,
            formData: true,
        });
    }

    async deleteDocument(id) {
        return this.request(`/documents/${id}/`, { method: 'DELETE' });
    }

    async getDocumentStatus(id) {
        return this.request(`/documents/${id}/status/`);
    }

    // Conversation endpoints
    async getConversations() {
        return this.request('/conversations/');
    }

    async createConversation(title = 'New Conversation', documentIds = []) {
        return this.request('/conversations/', {
            method: 'POST',
            body: {
                title,
                document_ids: documentIds,
            },
        });
    }

    async getConversation(id) {
        return this.request(`/conversations/${id}/`);
    }

    async deleteConversation(id) {
        return this.request(`/conversations/${id}/`, { method: 'DELETE' });
    }

    async sendMessage(conversationId, message, includeContext = true) {
        return this.request(`/conversations/${conversationId}/chat/`, {
            method: 'POST',
            body: {
                message,
                include_context: includeContext,
            },
        });
    }

    async clearConversation(id) {
        return this.request(`/conversations/${id}/clear/`, { method: 'POST' });
    }

    async quickQuestion(question, documentIds = []) {
        return this.request('/conversations/quick/', {
            method: 'POST',
            body: {
                question,
                document_ids: documentIds,
            },
        });
    }

    // Search endpoints
    async semanticSearch(query, documentIds = [], nResults = 5) {
        return this.request('/embeddings/search/', {
            method: 'POST',
            body: {
                query,
                document_ids: documentIds,
                n_results: nResults,
            },
        });
    }

    // Analytics endpoints
    async getUserUsage(days = 30) {
        return this.request(`/analytics/usage/?days=${days}`);
    }

    async getDailySummary(days = 30) {
        return this.request(`/analytics/usage/daily/?days=${days}`);
    }

    async getCostEstimate() {
        return this.request('/analytics/cost-estimate/');
    }
}

// Global API instance
const api = new APIClient();
