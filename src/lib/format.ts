const gel = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** "1,250.50 ₾" — GEL with the lari sign after the amount, as used in Georgia. */
export function formatGel(amount: number): string {
  return `${gel.format(amount)} ₾`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
