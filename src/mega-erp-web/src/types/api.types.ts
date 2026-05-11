// Auth
export interface LoginRequest { email: string; password: string }
export interface RegisterRequest { email: string; password: string; firstName: string; lastName: string; tenantId?: string }
export interface AuthResponse { token: string; email: string; firstName: string; lastName: string }

// Ecommerce
export interface Category { id: string; name: string; description?: string }
export interface ProductVariant { id: string; sku: string; name: string; priceDifference: number; stockQuantity: number }
export interface Product {
  id: string; name: string; description?: string; basePrice: number; sku: string
  categoryId: string; category?: Category; variants: ProductVariant[]
}
export interface CreateProductRequest { name: string; description?: string; basePrice: number; sku: string; categoryId: string }
export interface UpdateProductRequest { name: string; description?: string; basePrice: number; categoryId: string }

// Basket
export interface BasketItem { id: string; productId: string; productName: string; unitPrice: number; quantity: number }
export interface AddToBasketRequest { productId: string; quantity: number }
export interface UpdateBasketItemRequest { quantity: number }

// Orders
export interface OrderItem { id: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }
export interface Order {
  id: string; orderNumber?: string; orderDate: string; status: string
  totalAmount: number; userId: string; items: OrderItem[]
}

// Shipping
export interface ShippingMethod { id: string; name: string; carrier: string; baseCost: number; isActive: boolean }
export interface Shipment {
  id: string; orderId: string; trackingNumber: string; status: string
  shippedDate?: string; estimatedDeliveryDate?: string; shippingMethodId?: string
}

// Billing
export interface InvoiceItem { id: string; description: string; quantity: number; unitPrice: number; taxRate: number; lineTotal: number }
export interface Invoice {
  id: string; invoiceNumber: string; orderId: string; invoiceDate: string
  dueDate: string; totalAmount: number; totalTax: number; status: string; items: InvoiceItem[]
}

// HR
export interface Department { id: string; name: string; description?: string }
export interface Employee {
  id: string; firstName: string; lastName: string; email: string; phone: string
  hireDate: string; salary: number; departmentId: string; departmentName?: string
}
export interface LeaveRequest {
  id: string; employeeId: string; employeeName: string
  startDate: string; endDate: string; reason: string; status: string
}

// Accounting
export interface AccountingAccount { id: string; name: string; code: string; type: string; balance: number }
export interface JournalEntry {
  id: string; date: string; description: string; debit: number; credit: number
  accountingAccountId: string; accountName?: string; accountCode?: string
}

// UI
export interface Toast { id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }
