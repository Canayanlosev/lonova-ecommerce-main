import api from '../api'
import type { Order } from '@/types/api.types'

export const ordersService = {
  getAll: () => api.get<Order[]>('/api/sales/orders').then((r) => r.data),
  getById: (id: string) => api.get<Order>(`/api/sales/orders/${id}`).then((r) => r.data),
  cancel: (id: string) => api.post(`/api/sales/orders/${id}/cancel`),
}
