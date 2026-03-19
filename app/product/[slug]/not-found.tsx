import Link from 'next/link';

export default function ProductNotFound() {
  return (
    <main style={{ padding: '2rem', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.25rem' }}>Product not found</h1>
      <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>
        The product you are looking for does not exist or has been removed.
      </p>
      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/shop">← Back to Shop</Link>
      </p>
    </main>
  );
}
