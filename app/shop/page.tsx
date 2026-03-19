import { Suspense } from 'react';
import ShopClient from './ShopClient';

function ShopFallback() {
  return (
    <main
      style={{
        minHeight: '100vh',
        maxWidth: 1100,
        margin: '0 auto',
        padding: '1.5rem 1rem',
        background: '#fafaf8',
        color: '#1a1a1a',
      }}
    >
      <p style={{ color: '#6b5b4f' }}>Loading…</p>
    </main>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopFallback />}>
      <ShopClient />
    </Suspense>
  );
}
