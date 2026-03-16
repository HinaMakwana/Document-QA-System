/**
 * Authentication handling for AI Document Q&A System
 */
class AuthManager {
    constructor() {
        this.modal = document.getElementById('authModal');
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.modalTitle = document.getElementById('authModalTitle');
        this.modalClose = document.getElementById('authModalClose');
        this.showRegisterLink = document.getElementById('showRegister');
        this.showLoginLink = document.getElementById('showLogin');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.userNameEl = document.getElementById('userName');
        this.userTierEl = document.getElementById('userTier');

        this.init();
    }

    init() {
        // Form submissions
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (this.registerForm) {
            this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Toggle between login/register
        if (this.showRegisterLink) {
            this.showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }

        if (this.showLoginLink) {
            this.showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // Close modal
        if (this.modalClose) {
            this.modalClose.addEventListener('click', () => this.hideModal());
        }

        // Logout
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Listen for logout events
        window.addEventListener('auth:logout', () => this.onLogout());

        // Check authentication status on load
        this.checkAuth();
    }

    async checkAuth() {
        if (!api.isAuthenticated()) {
            this.showModal();
            return false;
        }

        try {
            const response = await api.getProfile();
            this.updateUserInfo(response.data || response);
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showModal();
            return false;
        }
    }

    updateUserInfo(user) {
        if (this.userNameEl) {
            this.userNameEl.textContent = user.full_name || user.email;
        }
        if (this.userTierEl) {
            this.userTierEl.textContent = user.tier || 'Free';
        }
    }

    showModal() {
        this.modal?.classList.add('active');
    }

    hideModal() {
        this.modal?.classList.remove('active');
    }

    showLoginForm() {
        if (this.modalTitle) this.modalTitle.textContent = 'Sign In';
        this.loginForm.style.display = 'block';
        this.registerForm.style.display = 'none';
    }

    showRegisterForm() {
        if (this.modalTitle) this.modalTitle.textContent = 'Sign Up';
        this.loginForm.style.display = 'none';
        this.registerForm.style.display = 'block';
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await api.login(email, password);
            this.updateUserInfo(response.user);
            this.hideModal();
            showToast('Welcome back!', 'success');
            window.dispatchEvent(new CustomEvent('auth:login'));
        } catch (error) {
            showToast(error.message || 'Login failed', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value;
        const firstName = document.getElementById('registerFirstName').value;
        const lastName = document.getElementById('registerLastName').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        try {
            const response = await api.register(email, password, passwordConfirm, firstName, lastName);
            this.updateUserInfo(response.data?.user || response.user);
            this.hideModal();
            showToast('Account created successfully!', 'success');
            window.dispatchEvent(new CustomEvent('auth:login'));
        } catch (error) {
            showToast(error.message || 'Registration failed', 'error');
        }
    }

    async handleLogout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        this.onLogout();
    }

    onLogout() {
        if (this.userNameEl) this.userNameEl.textContent = 'Guest';
        if (this.userTierEl) this.userTierEl.textContent = 'Free';
        this.showModal();
        showToast('Logged out successfully', 'info');
        window.dispatchEvent(new CustomEvent('auth:logout:complete'));
    }
}

// Initialize auth manager
const authManager = new AuthManager();
