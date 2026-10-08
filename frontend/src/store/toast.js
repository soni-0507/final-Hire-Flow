import { create } from 'zustand';

let nextId = 1;

export const useToast = create((set, get) => ({
  toasts: [],
  push(message, type = 'success') {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export const toast = {
  success: (m) => useToast.getState().push(m, 'success'),
  error: (m) => useToast.getState().push(m, 'error'),
};
