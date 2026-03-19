'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const STORAGE_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_IMPERIAL_STORAGE_BASE) ||
  'https://db.sharconai.com/s3';

function imageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const clean = path.replace(/^\/+/, '');
  return `${STORAGE_BASE}/${bucket}/${clean}`;
}

type Stats = {
  ok: boolean;
  counts?: Record<string, number>;
  error?: string;
  database?: string;
  host?: string;
};
type NewsItem = {
  id: string;
  slug: string;
  title_en: string;
  title_ru: string | null;
  excerpt_en: string | null;
  image: string | null;
  created_at: string;
};
type NewsFull = NewsItem & {
  content_en?: string | null;
  content_ru?: string | null;
  excerpt_ru?: string | null;
};
type ProductItem = {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  image_urls: string[] | string | null;
  created_at: string;
};
type EventItem = {
  id: string;
  title_en: string | null;
  title_ru: string | null;
  image: string | null;
  start_date: string | null;
  created_at: string;
};

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [products, setProducts] = useState<ProductItem[] | null>(null);
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openNewsSlug, setOpenNewsSlug] = useState<string | null>(null);
  const [openNewsData, setOpenNewsData] = useState<NewsFull | null>(null);
  const [openNewsLoading, setOpenNewsLoading] = useState(false);

  const fetchNewsBySlug = useCallback(async (slug: string) => {
    setOpenNewsLoading(true);
    setOpenNewsData(null);
    try {
      const res = await fetch(`/api/imperial/news/${encodeURIComponent(slug)}`);
      if (res.ok) {
        const data = await res.json();
        setOpenNewsData(data);
      } else {
        setOpenNewsData(null);
      }
    } catch {
      setOpenNewsData(null);
    } finally {
      setOpenNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (openNewsSlug) fetchNewsBySlug(openNewsSlug);
  }, [openNewsSlug, fetchNewsBySlug]);

  useEffect(() => {
    const base = '';
    Promise.all([
      fetch(`${base}/api/imperial/stats`).then((r) => r.json()) as Promise<Stats>,
      fetch(`${base}/api/imperial/news`).then((r) => (r.ok ? r.json() : r.json().then((e) => ({ __error: (e && (e.details || e.error)) || 'Failed' })))),
      fetch(`${base}/api/imperial/products`).then((r) => (r.ok ? r.json() : r.json().then((e) => ({ __error: (e && (e.details || e.error)) || 'Failed' })))),
      fetch(`${base}/api/imperial/events`).then((r) => (r.ok ? r.json() : r.json().then((e) => ({ __error: (e && (e.details || e.error)) || 'Failed' })))),
    ])
      .then(([s, n, p, e]) => {
        setStats(s);
        if (Array.isArray(n)) setNews(n);
        else if (n && typeof n === 'object' && '__error' in n) setErrors((prev) => ({ ...prev, news: String((n as { __error?: string }).__error) }));
        if (Array.isArray(p)) setProducts(p);
        else if (p && typeof p === 'object' && '__error' in p) setErrors((prev) => ({ ...prev, products: String((p as { __error?: string }).__error) }));
        if (Array.isArray(e)) setEvents(e);
        else if (e && typeof e === 'object' && '__error' in e) setErrors((prev) => ({ ...prev, events: String((e as { __error?: string }).__error) }));
      })
      .catch((err) => setErrors((prev) => ({ ...prev, global: err.message })))
      .finally(() => setLoading(false));
  }, []);

  const productImageUrls = (image_urls: ProductItem['image_urls']): string[] => {
    const asStrings = (arr: unknown[]): string[] =>
      arr
        .map((x) => {
          if (typeof x === 'string') return x;
          if (x && typeof x === 'object' && 'url' in x && typeof (x as { url: string }).url === 'string')
            return (x as { url: string }).url;
          return '';
        })
        .filter(Boolean);
    if (!image_urls) return [];
    if (Array.isArray(image_urls)) return asStrings(image_urls);
    if (typeof image_urls === 'string') {
      try {
        const parsed = JSON.parse(image_urls);
        return Array.isArray(parsed) ? asStrings(parsed) : [image_urls];
      } catch {
        return [image_urls];
      }
    }
    return [];
  };

  const newsWithImages = news?.filter((item) => item.image) ?? [];
  const productsWithImages =
    products?.filter((item) => productImageUrls(item.image_urls).length > 0) ?? [];
  const eventsWithImages = events?.filter((item) => item.image) ?? [];

  const openNewsImageUrl = openNewsData?.image
    ? (openNewsData.image.startsWith('http') ? openNewsData.image : imageUrl('imperial-news-images', openNewsData.image))
    : null;

  if (loading) {
    return (
      <main style={styles.main}>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Imperial</h1>
          <p style={styles.heroSub}>Loading… Checking connection to imperialdb and MinIO.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main style={styles.main}>
        <header style={styles.header}>
          <Link href="/" style={styles.logo}>Imperial</Link>
          <nav style={styles.nav}>
            <a href="#news" style={styles.navLink}>News</a>
            <a href="#products" style={styles.navLink}>Shop</a>
            <a href="#events" style={styles.navLink}>Events</a>
          </nav>
        </header>

        <section style={styles.hero}>
          <h1 style={styles.heroTitle}>An expression of refined living.</h1>
          <p style={styles.heroSub}>
            Enduring forms in noble materials, where balance becomes language.
          </p>
          <p style={styles.heroMuted}>
            imperialdb + MinIO · Database: <strong>{stats?.database ?? '—'}</strong>
            {stats?.host ? <> · Host: <strong>{stats.host}</strong></> : null}
          </p>
        </section>

        {!stats?.ok && (
          <section style={styles.connectionBar}>
            <span style={styles.connectionError}>
              Connection error: {stats?.error ?? errors.global ?? 'DATABASE_URL_IMPERIAL not set'}
            </span>
          </section>
        )}
        {stats?.ok && stats?.counts && (
          <section style={styles.connectionBar}>
            <span style={styles.connectionLabel}>Tables:</span>
            {Object.entries(stats.counts).map(([table, count]) => (
              <span key={table} style={styles.connectionStat}>{table}: {count >= 0 ? count : '—'}</span>
            ))}
          </section>
        )}

        <section id="news" style={styles.section}>
          <h2 style={styles.sectionTitle}>News</h2>
          {errors.news && <p style={styles.errorText}>{errors.news}</p>}
          {newsWithImages.length === 0 && !errors.news && (
            <p style={styles.muted}>No news with images yet.</p>
          )}
          <div style={styles.newsGrid}>
            {newsWithImages.slice(0, 12).map((item) => {
              const src = imageUrl('imperial-news-images', item.image);
              return (
                <button
                  key={item.id}
                  type="button"
                  style={styles.newsCard}
                  onClick={() => setOpenNewsSlug(item.slug)}
                >
                  {src && (
                    <img src={src} alt="" style={styles.newsThumb} referrerPolicy="no-referrer" />
                  )}
                  <div style={styles.newsCardBody}>
                    <span style={styles.newsCardTitle}>{item.title_ru || item.title_en}</span>
                    <span style={styles.newsCardDate}>
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section id="products" style={styles.section}>
          <h2 style={styles.sectionTitle}>Shop</h2>
          {errors.products && <p style={styles.errorText}>{errors.products}</p>}
          {productsWithImages.length === 0 && !errors.products && (
            <p style={styles.muted}>No products with images yet.</p>
          )}
          <div style={styles.productGrid}>
            {productsWithImages.slice(0, 8).map((item) => {
              const urls = productImageUrls(item.image_urls);
              const firstUrl = urls[0] ? imageUrl('imperial-product-images', urls[0]) : null;
              return (
                <Link
                  key={item.id}
                  href={`/product/${encodeURIComponent(item.slug)}`}
                  style={styles.productCard}
                >
                  {firstUrl && (
                    <img src={firstUrl} alt="" style={styles.productThumb} referrerPolicy="no-referrer" />
                  )}
                  <div style={styles.productCardBody}>
                    <span style={styles.productCardName}>{item.name}</span>
                    {item.price != null && (
                      <span style={styles.productCardPrice}>${item.price}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          <p style={styles.sectionLink}>
            <Link href="/shop" style={styles.link}>View all</Link>
          </p>
        </section>

        <section id="events" style={styles.section}>
          <h2 style={styles.sectionTitle}>Events</h2>
          {errors.events && <p style={styles.errorText}>{errors.events}</p>}
          {eventsWithImages.length === 0 && !errors.events && (
            <p style={styles.muted}>No events with images yet.</p>
          )}
          <div style={styles.eventGrid}>
            {eventsWithImages.slice(0, 6).map((item) => {
              const src = imageUrl('imperial-event-images', item.image);
              return (
                <div key={item.id} style={styles.eventCard}>
                  {src && (
                    <img src={src} alt="" style={styles.eventThumb} referrerPolicy="no-referrer" />
                  )}
                  <div style={styles.eventCardBody}>
                    <span style={styles.eventCardTitle}>
                      {item.title_ru || item.title_en || item.id}
                    </span>
                    {item.start_date && (
                      <span style={styles.eventCardDate}>
                        {new Date(item.start_date).toLocaleDateString('en-US')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <footer style={styles.footer}>
          <span style={styles.footerMuted}>Vercel · imperialdb · MinIO</span>
        </footer>
      </main>

      {openNewsSlug && (
        <div
          style={styles.modalOverlay}
          onClick={() => { setOpenNewsSlug(null); setOpenNewsData(null); }}
          role="dialog"
          aria-modal="true"
          aria-label="News article"
        >
          <div
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={styles.modalClose}
              onClick={() => { setOpenNewsSlug(null); setOpenNewsData(null); }}
              aria-label="Close"
            >
              ×
            </button>
            {openNewsLoading && (
              <p style={styles.modalLoading}>Loading…</p>
            )}
            {!openNewsLoading && openNewsData && (
              <>
                {openNewsImageUrl && (
                  <img
                    src={openNewsImageUrl}
                    alt=""
                    style={styles.modalImage}
                    referrerPolicy="no-referrer"
                  />
                )}
                <h3 style={styles.modalTitle}>
                  {openNewsData.title_ru || openNewsData.title_en}
                </h3>
                <p style={styles.modalDate}>
                  {new Date(openNewsData.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <div style={styles.modalContent}>
                  {(openNewsData.content_ru || openNewsData.content_en)
                    ? (openNewsData.content_ru || openNewsData.content_en || '')
                    : (openNewsData.excerpt_ru || openNewsData.excerpt_en || '—')}
                </div>
              </>
            )}
            {!openNewsLoading && !openNewsData && (
              <p style={styles.errorText}>Article not found.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    background: '#fafaf8',
    color: '#1a1a1a',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 2rem',
    maxWidth: 1200,
    margin: '0 auto',
    borderBottom: '1px solid #e5e0d8',
  },
  logo: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '1.5rem',
    fontWeight: 400,
    color: '#1a1a1a',
    textDecoration: 'none',
    letterSpacing: '0.05em',
  },
  nav: { display: 'flex', gap: '1.5rem' },
  navLink: {
    color: '#5c5349',
    textDecoration: 'none',
    fontSize: '0.9rem',
    letterSpacing: '0.04em',
  },
  hero: {
    padding: '4rem 2rem',
    maxWidth: 1200,
    margin: '0 auto',
    textAlign: 'center',
  },
  heroTitle: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
    fontWeight: 400,
    color: '#1a1a1a',
    margin: '0 0 0.75rem',
    letterSpacing: '0.02em',
    lineHeight: 1.25,
  },
  heroSub: {
    fontSize: '1rem',
    color: '#5c5349',
    margin: 0,
    maxWidth: 520,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  heroMuted: {
    marginTop: '1.5rem',
    fontSize: '0.8rem',
    color: '#6b5b4f',
  },
  connectionBar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.75rem 1.25rem',
    padding: '0.6rem 2rem',
    maxWidth: 1200,
    margin: '0 auto',
    background: '#f0ede8',
    borderBottom: '1px solid #e5e0d8',
    fontSize: '0.8rem',
  },
  connectionLabel: { color: '#6b5b4f' },
  connectionStat: { color: '#1a1a1a' },
  connectionError: { color: '#b54a4a' },
  section: {
    padding: '3rem 2rem',
    maxWidth: 1200,
    margin: '0 auto',
  },
  sectionTitle: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '1.5rem',
    fontWeight: 400,
    color: '#1a1a1a',
    margin: '0 0 1.5rem',
    letterSpacing: '0.04em',
  },
  sectionLink: { marginTop: '1rem', marginBottom: 0 },
  link: { color: '#6b5b4f', textDecoration: 'none' },
  muted: { color: '#6b5b4f', fontSize: '0.9rem' },
  errorText: { color: '#b54a4a', fontSize: '0.9rem' },
  newsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.5rem',
  },
  newsCard: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: '#fff',
    border: '1px solid #e5e0d8',
    borderRadius: 6,
    overflow: 'hidden',
    cursor: 'pointer',
    padding: 0,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  newsThumb: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
    display: 'block',
    background: '#ebe8e4',
  },
  newsCardBody: { padding: '1rem' },
  newsCardTitle: {
    display: 'block',
    fontSize: '1rem',
    color: '#1a1a1a',
    marginBottom: '0.35rem',
  },
  newsCardDate: { fontSize: '0.8rem', color: '#6b5b4f' },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1.5rem',
  },
  productCard: {
    display: 'block',
    background: '#fff',
    border: '1px solid #e5e0d8',
    borderRadius: 6,
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'border-color 0.2s',
  },
  productThumb: {
    width: '100%',
    height: 220,
    objectFit: 'cover',
    display: 'block',
    background: '#ebe8e4',
  },
  productCardBody: { padding: '1rem' },
  productCardName: { display: 'block', fontSize: '1rem', marginBottom: '0.25rem', color: '#1a1a1a' },
  productCardPrice: { fontSize: '0.9rem', color: '#6b5b4f' },
  eventGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '1.5rem',
  },
  eventCard: {
    background: '#fff',
    border: '1px solid #e5e0d8',
    borderRadius: 6,
    overflow: 'hidden',
  },
  eventThumb: {
    width: '100%',
    height: 140,
    objectFit: 'cover',
    display: 'block',
    background: '#ebe8e4',
  },
  eventCardBody: { padding: '1rem' },
  eventCardTitle: { display: 'block', fontSize: '1rem', marginBottom: '0.25rem', color: '#1a1a1a' },
  eventCardDate: { fontSize: '0.8rem', color: '#6b5b4f' },
  footer: {
    padding: '2rem',
    textAlign: 'center',
    borderTop: '1px solid #e5e0d8',
    fontSize: '0.85rem',
  },
  footerMuted: { color: '#6b5b4f' },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '2rem',
    overflow: 'auto',
  },
  modal: {
    position: 'relative',
    background: '#fff',
    border: '1px solid #e5e0d8',
    borderRadius: 8,
    maxWidth: 560,
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '2rem',
  },
  modalClose: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '1px solid #d4cfc7',
    background: '#fff',
    color: '#1a1a1a',
    fontSize: '1.5rem',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  modalLoading: { color: '#6b5b4f' },
  modalImage: {
    width: '100%',
    maxHeight: 280,
    objectFit: 'cover',
    borderRadius: 4,
    marginBottom: '1.25rem',
    display: 'block',
  },
  modalTitle: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '1.35rem',
    fontWeight: 400,
    margin: '0 0 0.5rem',
    color: '#1a1a1a',
  },
  modalDate: { fontSize: '0.85rem', color: '#6b5b4f', margin: '0 0 1rem' },
  modalContent: {
    fontSize: '0.95rem',
    lineHeight: 1.6,
    color: '#2a2a2a',
    whiteSpace: 'pre-wrap',
  },
};
