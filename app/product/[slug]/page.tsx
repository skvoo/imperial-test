import Link from 'next/link';
import { notFound } from 'next/navigation';
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
  description: string | null;
  price: number | null;
  category_id: number | null;
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

async function getProduct(slug: string): Promise<Product | null> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/imperial/products/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Product not found' };
  return {
    title: `${product.name} | Imperial`,
    description: product.description
      ? String(product.description).replace(/<[^>]+>/g, '').slice(0, 160)
      : undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const images = productImageUrls(product.image_urls);
  const mainImage = images[0] ? imageUrl(images[0]) : null;
  const allProducts = await getProducts();
  const related = allProducts.filter((p) => p.slug !== slug).slice(0, 6);

  return (
    <main style={styles.main}>
      <nav style={styles.breadcrumb}>
        <Link href="/">Home</Link>
        <span style={styles.breadcrumbSep}> / </span>
        <Link href="/shop">Shop</Link>
        <span style={styles.breadcrumbSep}> / </span>
        <span style={styles.muted}>{product.name}</span>
      </nav>

      <article style={styles.article}>
        <div style={styles.gallery}>
          {mainImage && (
            <img
              src={mainImage}
              alt={product.name}
              style={styles.mainImage}
            />
          )}
          {images.length > 1 && (
            <div style={styles.thumbnails}>
              {images.slice(1, 5).map((src, i) => {
                const url = imageUrl(src);
                return url ? (
                  <img key={i} src={url} alt="" style={styles.thumb} />
                ) : null;
              })}
            </div>
          )}
        </div>

        <div style={styles.details}>
          <h1 style={styles.title}>{product.name}</h1>
          {product.price != null && (
            <p style={styles.price}>${Number(product.price).toLocaleString()}</p>
          )}
          {product.description && (
            <div
              style={styles.description}
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          )}
          <p style={styles.muted}>Category: {product.category_id ?? '—'}</p>
          <div style={styles.actions}>
            <button type="button" style={styles.button}>
              Add to Cart
            </button>
            <button type="button" style={styles.buttonSecondary}>
              Book Consultation
            </button>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.h2}>You may also like</h2>
          <div style={styles.grid}>
            {related.map((p) => {
              const urls = productImageUrls(p.image_urls);
              const imgSrc = urls[0] ? imageUrl(urls[0]) : null;
              return (
                <Link key={p.id} href={`/product/${p.slug}`} style={styles.card}>
                  {imgSrc && (
                    <img src={imgSrc} alt={p.name} style={styles.cardImage} />
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
        </section>
      )}

      <footer style={styles.footer}>
        <Link href="/shop">← Back to Shop</Link>
        {' · '}
        <Link href="/test-imperial">Test Imperial (DB + MinIO)</Link>
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' },
  breadcrumb: { marginBottom: '1.5rem', fontSize: '0.9rem' },
  breadcrumbSep: { color: 'var(--muted)' },
  muted: { color: 'var(--muted)', fontSize: '0.9rem' },
  article: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    marginBottom: '3rem',
  },
  gallery: {},
  mainImage: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    borderRadius: 8,
    background: 'var(--surface)',
  },
  thumbnails: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  thumb: {
    width: 72,
    height: 72,
    objectFit: 'cover',
    borderRadius: 6,
    background: 'var(--surface)',
  },
  details: {},
  title: { fontSize: '1.75rem', marginTop: 0, marginBottom: '0.5rem' },
  price: { fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' },
  description: {
    fontSize: '0.95rem',
    lineHeight: 1.6,
    marginBottom: '1rem',
  },
  actions: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  button: {
    padding: '0.75rem 1.5rem',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '1rem',
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: '1rem',
    cursor: 'pointer',
  },
  section: { marginTop: '2rem' },
  h2: { fontSize: '1.25rem', marginBottom: '1rem' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '1rem',
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
  cardBody: { padding: '0.75rem', fontSize: '0.9rem' },
  cardTitle: { display: 'block', marginBottom: '0.25rem' },
  cardPrice: { color: 'var(--muted)' },
  footer: { marginTop: '2rem', fontSize: '0.9rem', color: 'var(--muted)' },
};
