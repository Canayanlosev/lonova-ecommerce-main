import api from '../api'
import type { Invoice } from '@/types/api.types'

export interface CreateInvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
}

export interface CreateInvoiceRequest {
  customerName: string
  customerEmail?: string
  invoiceDate: string    // YYYY-MM-DD
  dueDate: string        // YYYY-MM-DD
  items: CreateInvoiceItem[]
  notes?: string
}

export const billingService = {
  getAll: () => api.get<Invoice[]>('/api/billing/invoices').then((r) => r.data),
  getById: (id: string) => api.get<Invoice>(`/api/billing/invoices/${id}`).then((r) => r.data),
  getByOrderId: (orderId: string) =>
    api.get<Invoice>(`/api/billing/invoices/order/${orderId}`).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.put(`/api/billing/invoices/${id}/status`, { status }),
  create: (data: CreateInvoiceRequest) =>
    api.post<Invoice>('/api/billing/invoices', data).then((r) => r.data),
  issue: (id: string) =>
    api.put(`/api/billing/invoices/${id}/status`, { status: 'Issued' }),
  cancel: (id: string) =>
    api.put(`/api/billing/invoices/${id}/status`, { status: 'Cancelled' }),
}
