'use client'
import { create } from 'zustand'
import type { BasketItem } from '@/types/api.types'

interface BasketState {
  items: BasketItem[]
  itemCount: number
  setItems: (items: BasketItem[]) => void
  clear: () => void
}

export const useBasketStore = create<BasketState>()((set) => ({
  items: [],
  itemCount: 0,
  setItems: (items) => set({ items, itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }),
  clear: () => set({ items: [], itemCount: 0 }),
}))
