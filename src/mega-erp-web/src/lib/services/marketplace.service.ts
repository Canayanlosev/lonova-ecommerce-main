import axios from 'axios'

// Public API client — no auth token injected
const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
})

export interface MarketplaceVariant {
  id: string
  name: string
  sku: string
  price: number
  stockQuantity: number
}

export interface MarketplaceProduct {
  id: string
  name: string
  description?: string
  sku: string
  basePrice: number
  categoryId: string
  categoryName?: string
  variants: MarketplaceVariant[]
}

export interface MarketplaceProductListResponse {
  items: MarketplaceProduct[]
  totalCount: number
  page: number
  pageSize: number
}

export interface CatalogCategory {
  id: string
  name: string
  slug: string
  level: number
  iconUrl?: string
  children: CatalogCategory[]
}

export interface ProductsQuery {
  categoryId?: string
  minPrice?: number
  maxPrice?: number
  search?: string
  sort?: 'price_asc' | 'price_desc' | 'name' | 'newest'
  page?: number
  pageSize?: number
}

export const marketplaceService = {
  getProducts: async (query: ProductsQuery = {}): Promise<MarketplaceProductListResponse> => {
    const params = new URLSearchParams()
    if (query.categoryId) params.set('categoryId', query.categoryId)
    if (query.minPrice !== undefined) params.set('minPrice', String(query.minPrice))
    if (query.maxPrice !== undefined) params.set('maxPrice', String(query.maxPrice))
    if (query.search) params.set('search', query.search)
    if (query.sort) params.set('sort', query.sort)
    if (query.page) params.set('page', String(query.page))
    if (query.pageSize) params.set('pageSize', String(query.pageSize))
    const { data } = await publicApi.get(`/api/marketplace/products?${params}`)
    return data
  },

  getProduct: async (id: string): Promise<MarketplaceProduct> => {
    const { data } = await publicApi.get(`/api/marketplace/products/${id}`)
    return data
  },

  getCategories: async (): Promise<CatalogCategory[]> => {
    const { data } = await publicApi.get('/api/marketplace/categories')
    return data
  },
}
