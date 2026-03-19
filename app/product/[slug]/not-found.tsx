import Link from 'next/link';

export default function ProductNotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '2rem',
        maxWidth: 600,
        margin: '0 auto',
        textAlign: 'center',
        background: '#fafaf8',
        color: '#1a1a1a',
      }}
    >
      <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.35rem', fontWeight: 400 }}>
        Product not found
      </h1>
      <p style={{ color: '#6b5b4f', marginTop: '0.5rem' }}>
        The product you are looking for does not exist or has been removed.
      </p>
      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/shop" style={{ color: '#6b5b4f', textDecoration: 'none' }}>← Back to Shop</Link>
      </p>
    </main>
  );
}
