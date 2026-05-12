import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BuyerUser {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface BuyerAuthState {
  token: string | null
  buyer: BuyerUser | null
  isAuthenticated: boolean
  login: (token: string, buyer: BuyerUser) => void
  logout: () => void
}

export const useBuyerAuthStore = create<BuyerAuthState>()(
  persist(
    (set) => ({
      token: null,
      buyer: null,
      isAuthenticated: false,
      login: (token, buyer) => {
        if (typeof document !== 'undefined') {
          document.cookie = `buyer-token=${token}; path=/; max-age=${60 * 60 * 8}; SameSite=Strict`
        }
        set({ token, buyer, isAuthenticated: true })
      },
      logout: () => {
        if (typeof document !== 'undefined') {
          document.cookie = 'buyer-token=; path=/; max-age=0'
        }
        set({ token: null, buyer: null, isAuthenticated: false })
      },
    }),
    {
      name: 'buyer-auth',
      partialize: (state) => ({ token: state.token, buyer: state.buyer, isAuthenticated: state.isAuthenticated }),
    }
  )
)
