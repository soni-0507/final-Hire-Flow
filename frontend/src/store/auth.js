import { create } from 'zustand';
import { api } from '../lib/api.js';

export const useAuth = create((set, get) => ({
  token: localStorage.getItem('token'),
  user: null,
  ready: false,

  async init() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return set({ ready: true });
    set({ token });
    try {
      const { user } = await api.get('/auth/me');
      set({ user, ready: true });
    } catch {
      get().logout();
      set({ ready: true });
    }
  },

  async login(email, password, remember = true) {
    const { token, user } = await api.post('/auth/login', { email, password });
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    (remember ? localStorage : sessionStorage).setItem('token', token);
    set({ token, user });
  },

  async signup(payload) {
    return api.post('/auth/signup', payload);
  },

  async verifyEmail(email, code) {
    return api.post('/auth/verify-email', { email, code });
  },

  async resendVerification(email) {
    return api.post('/auth/resend-verification', { email });
  },

  logout() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    set({ token: null, user: null });
  },
}));
