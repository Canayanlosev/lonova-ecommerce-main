import api from '../api'
import type { Invoice } from '@/types/api.types'

export const billingService = {
  getAll: () => api.get<Invoice[]>('/api/billing/invoices').then((r) => r.data),
  getById: (id: string) => api.get<Invoice>(`/api/billing/invoices/${id}`).then((r) => r.data),
  getByOrderId: (orderId: string) =>
    api.get<Invoice>(`/api/billing/invoices/order/${orderId}`).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.put(`/api/billing/invoices/${id}/status`, { status }),
}
