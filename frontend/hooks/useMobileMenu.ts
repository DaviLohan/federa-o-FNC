'use client';

import { create } from 'zustand';

interface MobileMenuState {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
}

export const useMobileMenu = create<MobileMenuState>((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  close: () => set({ isOpen: false }),
  open: () => set({ isOpen: true }),
}));

/**
 * @deprecated Use useMobileMenu instead. Kept for backward compatibility.
 */
export const useSidebar = useMobileMenu;
