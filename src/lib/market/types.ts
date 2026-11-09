/** Statuses and roles of the order, payment and settlement workflow. */

export type Role = "customer" | "manufacturer" | "admin";

export interface Actor {
  id: string;
  role: Role;
  name: string;
  manufacturerSlug?: string | null;
}

/** The customer's single order timeline. */
export const ORDER_FLOW = [
  "placed",
  "awaiting_payment",
  "payment_submitted",
  "payment_confirmed",
  "preparing",
  "ready",
  "collected",
  "in_delivery",
  "delivered",
  "completed",
] as const;

export const ORDER_EXCEPTIONS = [
  "payment_rejected",
  "manufacturer_rejected",
  "preparation_delayed",
  "cancelled",
  "refund_processing",
  "refunded",
  "delivery_issue",
] as const;

export type OrderStatus = (typeof ORDER_FLOW)[number] | (typeof ORDER_EXCEPTIONS)[number];

/** One manufacturer's part of an order (its own shipment and settlement). */
export const FULFILLMENT_STATUSES = [
  "awaiting_payment",
  "new",
  "accepted",
  "preparing",
  "in_progress",
  "ready",
  "collected",
  "in_delivery",
  "delivered",
  "rejected",
  "cancelled",
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "awaiting_payment",
  "submitted",
  "verification_pending",
  "confirmed",
  "partial",
  "incorrect_amount",
  "rejected",
  "refund_pending",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYOUT_STATUSES = [
  "not_eligible",
  "eligible",
  "authorized",
  "transfer_initiated",
  "transfer_completed",
  "transfer_failed",
  "on_hold",
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export type CommissionBase = "products" | "products_and_delivery";

export type LedgerKind =
  | "customer_payment"
  | "delivery_allocation"
  | "commission"
  | "manufacturer_payable"
  | "manufacturer_payout"
  | "refund_due"
  | "refund_paid";

export type MarketErrorCode =
  | "forbidden"
  | "not_found"
  | "invalid_state"
  | "invalid_input"
  | "manual_delivery"
  | "empty_cart"
  | "email_unverified"
  | "email_taken"
  | "weak_password"
  | "password_mismatch"
  | "bad_credentials"
  | "too_many_attempts"
  | "account_suspended"
  | "token_invalid"
  | "seller_not_approved";

/** A refused action. The UI shows a translated message for the code. */
export class MarketError extends Error {
  constructor(
    public code: MarketErrorCode,
    message?: string,
  ) {
    super(message ? `${code}: ${message}` : code);
    this.name = "MarketError";
  }
}
