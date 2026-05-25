import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistStore {
  items: string[]  // productIds
  add: (id: string) => void
  remove: (id: string) => void
  toggle: (id: string) => void
  has: (id: string) => boolean
  count: () => number
  clear: () => void
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (id) => set((s) => ({ items: s.items.includes(id) ? s.items : [...s.items, id] })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i !== id) })),
      toggle: (id) => {
        const { items } = get()
        if (items.includes(id)) {
          set({ items: items.filter((i) => i !== id) })
        } else {
          set({ items: [...items, id] })
        }
      },
      has: (id) => get().items.includes(id),
      count: () => get().items.length,
      clear: () => set({ items: [] }),
    }),
    { name: 'wishlist' }
  )
)
