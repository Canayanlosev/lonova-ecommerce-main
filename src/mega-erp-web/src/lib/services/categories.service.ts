import api from '../api'
import type { Category, CreateCategoryRequest } from '@/types/api.types'

export const categoriesService = {
  getAll: () => api.get<Category[]>('/api/ecommerce/categories').then((r) => r.data),
  getById: (id: string) => api.get<Category>(`/api/ecommerce/categories/${id}`).then((r) => r.data),
  create: (req: CreateCategoryRequest) =>
    api.post<Category>('/api/ecommerce/categories', req).then((r) => r.data),
  update: (id: string, req: CreateCategoryRequest) =>
    api.put(`/api/ecommerce/categories/${id}`, req),
  delete: (id: string) => api.delete(`/api/ecommerce/categories/${id}`),
}
