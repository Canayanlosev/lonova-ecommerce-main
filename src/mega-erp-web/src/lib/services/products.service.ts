import api from '../api'
import type { Product, Category, CreateProductRequest, UpdateProductRequest } from '@/types/api.types'

export const productsService = {
  getAll: () => api.get<Product[]>('/api/ecommerce/products').then((r) => r.data),
  getById: (id: string) => api.get<Product>(`/api/ecommerce/products/${id}`).then((r) => r.data),
  create: (data: CreateProductRequest) => api.post<Product>('/api/ecommerce/products', data).then((r) => r.data),
  update: (id: string, data: UpdateProductRequest) => api.put(`/api/ecommerce/products/${id}`, data),
  delete: (id: string) => api.delete(`/api/ecommerce/products/${id}`),
  clone: (id: string) => api.post<Product>(`/api/ecommerce/products/${id}/clone`).then((r) => r.data),
  bulkPrice: (productIds: string[], adjustmentType: 'Percent' | 'Fixed', value: number) =>
    api.post<{ updated: number }>('/api/ecommerce/products/bulk-price', { productIds, adjustmentType, value }).then((r) => r.data),
  uploadImage: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ imageUrl: string }>(`/api/ecommerce/products/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then((r) => r.data)
  },

  getCategories: () => api.get<Category[]>('/api/ecommerce/categories').then((r) => r.data),
  getCategoryById: (id: string) => api.get<Category>(`/api/ecommerce/categories/${id}`).then((r) => r.data),
  createCategory: (data: { name: string; description?: string }) =>
    api.post<Category>('/api/ecommerce/categories', data).then((r) => r.data),
  updateCategory: (id: string, data: { name: string; description?: string }) =>
    api.put(`/api/ecommerce/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/api/ecommerce/categories/${id}`),
}
