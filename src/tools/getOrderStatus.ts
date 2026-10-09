import type Anthropic from '@anthropic-ai/sdk'

import { mockOrders, type PaymentStatus, type ShippingStatus } from '../mockOrders.js'

export const getOrderStatusTool: Anthropic.Tool = {
  name: 'getOrderStatus',
  description:
    'Look up an order by its order number and return its payment status ' +
    '(paid, awaiting payment, payment failed, refunded) and shipping status ' +
    '(preparing for delivery, in delivery, delivered). If no order matches, ' +
    'returns an error flag and a customer-friendly message.',
  input_schema: {
    type: 'object',
    properties: {
      orderNumber: {
        type: 'string',
        description: 'The order number to look up, e.g. ORD-123456.',
      },
    },
    required: ['orderNumber'],
  },
}

export interface GetOrderStatusInput {
  orderNumber: string
}

export type OrderStatusResult =
  | {
      error: false
      orderNumber: string
      paymentStatus: PaymentStatus
      shippingStatus: ShippingStatus
    }
  | { error: true; message: string }

export async function getOrderStatus(input: GetOrderStatusInput): Promise<OrderStatusResult> {
  const key = typeof input?.orderNumber === 'string' ? input.orderNumber.trim().toUpperCase() : ''

  // TODO: remove these simulated failures when a real DB / external API replaces the mock.
  if (key === 'ORD-TIMEOUT') {
    await new Promise((resolve) => setTimeout(resolve, 60_000)) // never resolves in time
  }
  if (key === 'ORD-NETERR') {
    throw new Error('ECONNREFUSED: order service is unreachable')
  }
  if (key === 'ORD-UNAVAILABLE') {
    return {
      error: true,
      message: 'Our order system is temporarily unavailable. Please try again in a few minutes.',
    }
  }

  const order = mockOrders[key]

  if (!order) {
    return {
      error: true,
      message: "We couldn't find an order with that number. Please double-check it and try again.",
    }
  }

  return {
    error: false,
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    shippingStatus: order.shippingStatus,
  }
}
