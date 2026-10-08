import { create } from 'zustand';

const apply = (mode) => document.documentElement.classList.toggle('dark', mode === 'dark');

export const useTheme = create((set, get) => ({
  mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  toggle() {
    const mode = get().mode === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', mode);
    apply(mode);
    set({ mode });
  },
}));
