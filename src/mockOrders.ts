export type PaymentStatus = 'paid' | 'awaiting payment' | 'payment failed' | 'refunded'

export type ShippingStatus = 'preparing for delivery' | 'in delivery' | 'delivered'

export interface Order {
  orderNumber: string
  paymentStatus: PaymentStatus
  shippingStatus: ShippingStatus
}

// Mock order data keyed by order number.
export const mockOrders: Record<string, Order> = {
  'ORD-100001': {
    orderNumber: 'ORD-100001',
    paymentStatus: 'paid',
    shippingStatus: 'preparing for delivery',
  },
  'ORD-100002': {
    orderNumber: 'ORD-100002',
    paymentStatus: 'paid',
    shippingStatus: 'in delivery',
  },
  'ORD-100003': {
    orderNumber: 'ORD-100003',
    paymentStatus: 'paid',
    shippingStatus: 'delivered',
  },
  'ORD-100004': {
    orderNumber: 'ORD-100004',
    paymentStatus: 'awaiting payment',
    shippingStatus: 'preparing for delivery',
  },
  'ORD-100005': {
    orderNumber: 'ORD-100005',
    paymentStatus: 'payment failed',
    shippingStatus: 'preparing for delivery',
  },
  'ORD-100006': {
    orderNumber: 'ORD-100006',
    paymentStatus: 'refunded',
    shippingStatus: 'delivered',
  },
}
