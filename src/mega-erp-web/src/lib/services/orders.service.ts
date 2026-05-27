import api from '../api'
import type { Order } from '@/types/api.types'

export interface CreateOrderLine {
  productId: string
  quantity: number
  unitPrice: number
}

export const ordersService = {
  getAll: () => api.get<Order[]>('/api/sales/orders').then((r) => r.data),
  getById: (id: string) => api.get<Order>(`/api/sales/orders/${id}`).then((r) => r.data),
  cancel: (id: string) => api.post(`/api/sales/orders/${id}/cancel`),
  updateStatus: (id: string, status: string) => api.patch(`/api/sales/orders/${id}/status`, { status }),
  create: (lines: CreateOrderLine[], notes?: string) =>
    api.post<Order>('/api/sales/orders', {
      items: lines.map(l => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
      ...(notes ? { notes } : {}),
    }).then((r) => r.data),
}
