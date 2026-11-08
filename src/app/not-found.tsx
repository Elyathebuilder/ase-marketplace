import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-3xl font-extrabold">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-ink-2">It may have been moved, or the product is no longer listed.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn btn-dark">Home</Link>
        <Link href="/products" className="btn btn-outline">Browse products</Link>
      </div>
    </div>
  );
}
