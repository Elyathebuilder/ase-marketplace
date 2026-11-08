import { lowestWholesalePrice } from "@/lib/catalog";
import { formatGel } from "@/lib/format";
import type { Product } from "@/lib/types";

/** Card price: retail when sold at retail, otherwise "wholesale from" or "price on request". */
export function CardPrice({ product }: { product: Product }) {
  const wholesale = lowestWholesalePrice(product);
  if (product.retailPrice != null)
    return (
      <div>
        <div className="text-lg font-bold text-ink">
          {formatGel(product.retailPrice)}
          <span className="text-xs font-medium text-muted"> / {product.unit}</span>
        </div>
        {wholesale != null && (
          <div className="text-xs text-muted">
            Wholesale from <span className="font-semibold text-ink-2">{formatGel(wholesale)}</span>
          </div>
        )}
      </div>
    );
  if (wholesale != null)
    return (
      <div>
        <div className="text-xs text-muted">Wholesale from</div>
        <div className="text-lg font-bold text-ink">
          {formatGel(wholesale)}
          <span className="text-xs font-medium text-muted"> / {product.unit}</span>
        </div>
      </div>
    );
  return <div className="text-base font-bold text-ink">Price on request</div>;
}
