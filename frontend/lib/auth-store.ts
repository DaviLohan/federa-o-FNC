import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { apiClient } from '@/lib/api-client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user }),
      
      setToken: (token) => {
        if (token) {
          apiClient.setToken(token);
        } else {
          apiClient.removeToken();
        }
        set({ token });
      },

      login: (token, user) => {
        apiClient.setToken(token);
        set({
          token,
          user,
          isAuthenticated: true,
        });
      },

      logout: () => {
        apiClient.removeToken();
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Restaurar token no apiClient após hidratação do Zustand
        if (state?.token) {
          apiClient.setToken(state.token);
        }
      },
    }
  )
);
