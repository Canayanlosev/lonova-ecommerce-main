'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartDto, CartItemDto } from '@/lib/services/marketplace.service'

interface BuyerCartState {
  items: CartItemDto[]
  total: number
  itemCount: number
  setCart: (cart: CartDto) => void
  clear: () => void
}

export const useBuyerCartStore = create<BuyerCartState>()(
  persist(
    (set) => ({
      items: [],
      total: 0,
      itemCount: 0,
      setCart: (cart) => set({ items: cart.items, total: cart.total, itemCount: cart.itemCount }),
      clear: () => set({ items: [], total: 0, itemCount: 0 }),
    }),
    { name: 'buyer-cart' }
  )
)
