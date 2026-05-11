import api from '../api'
import type { Shipment, ShippingMethod } from '@/types/api.types'

export const shippingService = {
  getShipments: () => api.get<Shipment[]>('/api/shipping/shipments').then((r) => r.data),
  getShipmentById: (id: string) =>
    api.get<Shipment>(`/api/shipping/shipments/${id}`).then((r) => r.data),
  updateShipmentStatus: (id: string, status: string) =>
    api.put(`/api/shipping/shipments/${id}/status`, { status }),

  getMethods: () => api.get<ShippingMethod[]>('/api/shipping/methods').then((r) => r.data),
  createMethod: (data: { name: string; carrier: string; baseCost: number }) =>
    api.post<ShippingMethod>('/api/shipping/methods', data).then((r) => r.data),
  updateMethod: (id: string, data: { name: string; carrier: string; baseCost: number; isActive: boolean }) =>
    api.put(`/api/shipping/methods/${id}`, data),
  deleteMethod: (id: string) => api.delete(`/api/shipping/methods/${id}`),
}
