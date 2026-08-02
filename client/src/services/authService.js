import { apiFetch } from './api';
import { API_BASE_URL } from '../config/env';

export const API_URL = API_BASE_URL;

const TOKEN_KEY = 'trackntal_token';
const USER_KEY = 'trackntal_user';

export const authService = {
    getToken() {
        try {
            return localStorage.getItem(TOKEN_KEY) || null;
        } catch {
            return null;
        }
    },

    getCurrentUser() {
        try {
            const userStr = localStorage.getItem(USER_KEY);
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    },

    isAuthenticated() {
        return Boolean(this.getToken() && this.getCurrentUser());
    },

    setSession(token, user) {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },

    async login(email, password) {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        this.setSession(data.token, data.user);
        return data;
    },

    async register(name, email, password) {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        this.setSession(data.token, data.user);
        return data;
    },

    async fetchCurrentUser() {
        const token = this.getToken();
        if (!token) return null;

        const response = await apiFetch(`${API_URL}/api/auth/me`);
        if (!response.ok) return null;

        const data = await response.json();
        if (data.user) {
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
        return data.user;
    },

    async updateProfile(name) {
        const response = await apiFetch(`${API_URL}/api/auth/profile`, {
            method: 'PUT',
            body: JSON.stringify({ name }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update profile');
        }

        if (data.user) {
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
        return data.user;
    },

    async getMyRooms() {
        const response = await apiFetch(`${API_URL}/api/auth/my-rooms`);
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        return data.rooms || [];
    },
};

export default authService;
