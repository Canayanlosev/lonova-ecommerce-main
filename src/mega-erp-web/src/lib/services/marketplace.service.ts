import axios from 'axios'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const publicApi = axios.create({ baseURL: BASE, headers: { 'Content-Type': 'application/json' } })

const buyerApi = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('buyer-token') : null
  return axios.create({
    baseURL: BASE,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
}

export interface MarketplaceVariant {
  id: string
  name: string
  variantType: string  // "Beden", "Numara", "Renk", "Depolama", "Variant"
  colorHex?: string
  sku: string
  price: number
  stockQuantity: number
}

export interface MarketplaceProduct {
  id: string
  name: string
  description?: string
  sku: string
  slug?: string
  imageUrl?: string
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

export interface CartItemDto {
  id: string
  productId: string
  variantId?: string
  productName: string
  variantName?: string
  imageUrl?: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface CartDto {
  items: CartItemDto[]
  total: number
  itemCount: number
}

export interface BuyerOrderItemDto {
  productId: string
  variantId?: string
  productName: string
  variantName?: string
  imageUrl?: string
  unitPrice: number
  quantity: number
}

export interface BuyerOrderDto {
  id: string
  totalAmount: number
  status: string
  createdAt: string
  items: BuyerOrderItemDto[]
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

  // Cart — buyer JWT required
  getCart: async (): Promise<CartDto> => {
    const { data } = await buyerApi().get('/api/marketplace/cart')
    return data
  },

  addToCart: async (productId: string, variantId?: string, quantity = 1): Promise<CartDto> => {
    const { data } = await buyerApi().post('/api/marketplace/cart/items', { productId, variantId, quantity })
    return data
  },

  updateCartItem: async (itemId: string, quantity: number): Promise<CartDto> => {
    const { data } = await buyerApi().patch(`/api/marketplace/cart/items/${itemId}`, quantity, {
      headers: { 'Content-Type': 'application/json' },
    })
    return data
  },

  removeCartItem: async (itemId: string): Promise<CartDto> => {
    const { data } = await buyerApi().delete(`/api/marketplace/cart/items/${itemId}`)
    return data
  },

  clearCart: async (): Promise<void> => {
    await buyerApi().delete('/api/marketplace/cart')
  },

  checkout: async (): Promise<BuyerOrderDto> => {
    const { data } = await buyerApi().post('/api/marketplace/cart/checkout')
    return data
  },

  // Orders
  getOrders: async (): Promise<BuyerOrderDto[]> => {
    const { data } = await buyerApi().get('/api/marketplace/orders')
    return data
  },
}
