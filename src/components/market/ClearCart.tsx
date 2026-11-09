"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cart";

/** Empties the browser cart once the order has been placed. */
export function ClearCart() {
  useEffect(() => clearCart(), []);
  return null;
}
