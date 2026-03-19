import Link from 'next/link';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

const STORAGE_BASE =
  process.env.NEXT_PUBLIC_IMPERIAL_STORAGE_BASE || 'https://db.sharconai.com/s3';

function imageUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const clean = path.replace(/^\/+/, '');
  return `${STORAGE_BASE}/imperial-product-images/${clean}`;
}

function productImageUrls(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((x) => {
        if (typeof x === 'string') return x;
        if (x && typeof x === 'object' && 'url' in x && typeof (x as { url: string }).url === 'string')
          return (x as { url: string }).url;
        return '';
      })
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw);
      return Array.isArray(j) ? productImageUrls(j) : [raw];
    } catch {
      return [raw];
    }
  }
  return [];
}

type Product = {
  id: number;
  slug: string;
  name: string;
  price: number | null;
  image_urls: string[] | unknown[] | null;
};

function getBaseUrl(): string {
  try {
    const h = headers();
    const host = h.get('host') || h.get('x-forwarded-host');
    const proto = h.get('x-forwarded-proto') || 'https';
    if (host) return `${proto === 'https' ? 'https' : 'http'}://${host}`;
  } catch {
    /* not in request context */
  }
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
}

async function getProducts(): Promise<Product[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/imperial/products`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export default async function ShopPage() {
  const products = await getProducts();
  const displayCount = 24;

  return (
    <main style={styles.main}>
      <nav style={styles.breadcrumb}>
        <Link href="/">Home</Link>
        <span style={styles.breadcrumbSep}> / </span>
        <span style={styles.muted}>Shop</span>
      </nav>

      <h1 style={styles.title}>Shop</h1>
      <p style={styles.muted}>
        Products from imperialdb (Pigsty) · Images from MinIO (db.sharconai.com/s3). Example pages like imperialmiami.com/product/...
      </p>

      <div style={styles.grid}>
        {products.slice(0, displayCount).map((p) => {
          const urls = productImageUrls(p.image_urls);
          const imgSrc = urls[0] ? imageUrl(urls[0]) : null;
          return (
            <Link key={p.id} href={`/product/${p.slug}`} style={styles.card}>
              {imgSrc ? (
                <img src={imgSrc} alt={p.name} style={styles.cardImage} />
              ) : (
                <div style={styles.cardPlaceholder}>No image</div>
              )}
              <div style={styles.cardBody}>
                <strong style={styles.cardTitle}>{p.name}</strong>
                {p.price != null && (
                  <span style={styles.cardPrice}>
                    ${Number(p.price).toLocaleString()}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {products.length > displayCount && (
        <p style={styles.muted}>
          Showing {displayCount} of {products.length} products.
        </p>
      )}

      <footer style={styles.footer}>
        <Link href="/">← Home</Link>
        {' · '}
        <Link href="/test-imperial">Test Imperial (DB + MinIO)</Link>
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' },
  breadcrumb: { marginBottom: '1rem', fontSize: '0.9rem' },
  breadcrumbSep: { color: 'var(--muted)' },
  muted: { color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' },
  title: { fontSize: '1.5rem', marginBottom: '0.25rem' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1.25rem',
  },
  card: {
    textDecoration: 'none',
    color: 'inherit',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
    display: 'block',
  },
  cardImage: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    background: 'var(--surface)',
  },
  cardPlaceholder: {
    width: '100%',
    aspectRatio: '1',
    background: 'var(--surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    color: 'var(--muted)',
  },
  cardBody: { padding: '0.75rem', fontSize: '0.9rem' },
  cardTitle: { display: 'block', marginBottom: '0.25rem' },
  cardPrice: { color: 'var(--muted)' },
  footer: { marginTop: '2rem', fontSize: '0.9rem', color: 'var(--muted)' },
};
