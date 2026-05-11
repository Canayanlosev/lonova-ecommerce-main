'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => {
        localStorage.setItem('auth-token', token)
        document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`
        set({ token, user, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('auth-token')
        document.cookie = 'auth-token=; path=/; max-age=0'
        set({ token: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
