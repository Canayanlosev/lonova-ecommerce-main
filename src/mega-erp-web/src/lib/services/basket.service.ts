import api from '../api'
import type { BasketItem, AddToBasketRequest } from '@/types/api.types'

export const basketService = {
  get: () => api.get<BasketItem[]>('/api/sales/basket').then((r) => r.data),
  addItem: (data: AddToBasketRequest) => api.post('/api/sales/basket/items', data),
  updateItem: (productId: string, quantity: number) =>
    api.put(`/api/sales/basket/items/${productId}`, { quantity }),
  removeItem: (productId: string) => api.delete(`/api/sales/basket/items/${productId}`),
  clear: () => api.delete('/api/sales/basket'),
  checkout: () => api.post<{ orderId: string }>('/api/sales/basket/checkout').then((r) => r.data),
}
