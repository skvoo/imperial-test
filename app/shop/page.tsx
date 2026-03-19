'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const STORAGE_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_IMPERIAL_STORAGE_BASE) ||
  'https://db.sharconai.com/s3';
const PER_PAGE = 12;

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

type Category = { id: number; name: string };

type ProductsResponse = { items: Product[]; total: number; page: number; per_page: number };

function buildShopUrl(search: string, categoryId: string, pageNum: number): string {
  const p = new URLSearchParams();
  if (search) p.set('search', search);
  if (categoryId) p.set('category_id', categoryId);
  if (pageNum > 1) p.set('page', String(pageNum));
  const q = p.toString();
  return q ? `/shop?${q}` : '/shop';
}

export default function ShopPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const categoryId = searchParams.get('category_id') || '';
  const search = searchParams.get('search') || '';

  const setParams = useCallback(
    (updates: { search?: string; category_id?: string; page?: number }) => {
      const p = new URLSearchParams(searchParams.toString());
      if (updates.search !== undefined) {
        if (updates.search) p.set('search', updates.search);
        else p.delete('search');
      }
      if (updates.category_id !== undefined) {
        if (updates.category_id) p.set('category_id', updates.category_id);
        else p.delete('category_id');
      }
      if (updates.page !== undefined) {
        if (updates.page > 1) p.set('page', String(updates.page));
        else p.delete('page');
      }
      const q = p.toString();
      router.replace(q ? `/shop?${q}` : '/shop');
    },
    [searchParams, router]
  );

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('per_page', String(PER_PAGE));
    if (search) params.set('search', search);
    if (categoryId) params.set('category_id', categoryId);

    Promise.all([
      fetch(`/api/imperial/products?${params.toString()}`).then((r) => r.json()),
      fetch('/api/imperial/categories').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([data, cats]) => {
        if (data.items !== undefined) {
          setProducts(Array.isArray(data.items) ? data.items : []);
          setTotal((data as ProductsResponse).total ?? 0);
        } else {
          setProducts(Array.isArray(data) ? data : []);
          setTotal((Array.isArray(data) ? data : []).length);
        }
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch(() => {
        setProducts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, search, categoryId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ search: searchInput.trim() || undefined, page: 1 });
  };

  const totalPages = Math.ceil(total / PER_PAGE) || 1;

  return (
    <main style={styles.main}>
      <nav style={styles.breadcrumb}>
        <Link href="/" style={styles.breadcrumbLink}>Home</Link>
        <span style={styles.breadcrumbSep}> / </span>
        <span style={styles.breadcrumbCurrent}>Shop</span>
      </nav>

      <h1 style={styles.title}>Shop</h1>

      <div style={styles.toolbar}>
        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <input
            type="search"
            placeholder="Search products…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={styles.searchInput}
            aria-label="Search products"
          />
          <button type="submit" style={styles.searchBtn}>
            Search
          </button>
        </form>
        <div style={styles.categories}>
          <label htmlFor="cat-select" style={styles.catLabel}>Category:</label>
          <select
            id="cat-select"
            value={categoryId}
            onChange={(e) => setParams({ category_id: e.target.value || undefined, page: 1 })}
            style={styles.select}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p style={styles.muted}>Loading…</p>
      ) : (
        <>
          <p style={styles.muted}>
            {total === 0 ? 'No products found.' : `Showing ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, total)} of ${total} products.`}
          </p>
          <div style={styles.grid}>
            {products.map((p) => {
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

          {totalPages > 1 && (
            <nav style={styles.pagination} aria-label="Product pagination">
              {page > 1 && (
                <Link
                  href={buildShopUrl(search, categoryId, page - 1)}
                  style={styles.pageLink}
                >
                  ← Previous
                </Link>
              )}
              <span style={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={buildShopUrl(search, categoryId, page + 1)}
                  style={styles.pageLink}
                >
                  Next →
                </Link>
              )}
            </nav>
          )}
        </>
      )}

      <footer style={styles.footer}>
        <Link href="/" style={styles.footerLink}>← Home</Link>
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    maxWidth: 1100,
    margin: '0 auto',
    padding: '1.5rem 1rem',
    background: '#fafaf8',
    color: '#1a1a1a',
  },
  breadcrumb: { marginBottom: '1rem', fontSize: '0.9rem' },
  breadcrumbLink: { color: '#6b5b4f', textDecoration: 'none' },
  breadcrumbSep: { color: '#9a9086' },
  breadcrumbCurrent: { color: '#1a1a1a' },
  title: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '1.75rem',
    marginBottom: '1rem',
    color: '#1a1a1a',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.25rem',
  },
  searchForm: { display: 'flex', gap: '0.5rem', flex: '1 1 260px' },
  searchInput: {
    flex: 1,
    minWidth: 0,
    padding: '0.5rem 0.75rem',
    border: '1px solid #d4cfc7',
    borderRadius: 6,
    fontSize: '0.95rem',
    background: '#fff',
  },
  searchBtn: {
    padding: '0.5rem 1rem',
    border: '1px solid #b8a99a',
    borderRadius: 6,
    background: '#e8e4df',
    color: '#1a1a1a',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  categories: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  catLabel: { fontSize: '0.9rem', color: '#5c5349' },
  select: {
    padding: '0.5rem 0.75rem',
    border: '1px solid #d4cfc7',
    borderRadius: 6,
    fontSize: '0.95rem',
    background: '#fff',
    color: '#1a1a1a',
  },
  muted: { color: '#6b5b4f', fontSize: '0.9rem', marginBottom: '1rem' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1.25rem',
  },
  card: {
    textDecoration: 'none',
    color: 'inherit',
    border: '1px solid #e5e0d8',
    borderRadius: 8,
    overflow: 'hidden',
    display: 'block',
    background: '#fff',
    transition: 'box-shadow 0.2s, border-color 0.2s',
  },
  cardImage: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    background: '#ebe8e4',
  },
  cardPlaceholder: {
    width: '100%',
    aspectRatio: '1',
    background: '#ebe8e4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    color: '#9a9086',
  },
  cardBody: { padding: '0.75rem', fontSize: '0.9rem' },
  cardTitle: { display: 'block', marginBottom: '0.25rem', color: '#1a1a1a' },
  cardPrice: { color: '#6b5b4f', fontWeight: 500 },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    marginTop: '2rem',
    flexWrap: 'wrap',
  },
  pageLink: {
    color: '#6b5b4f',
    textDecoration: 'none',
    fontSize: '0.95rem',
    padding: '0.35rem 0.75rem',
    border: '1px solid #d4cfc7',
    borderRadius: 6,
    background: '#fff',
  },
  pageInfo: { fontSize: '0.9rem', color: '#5c5349' },
  footer: { marginTop: '2rem', fontSize: '0.9rem' },
  footerLink: { color: '#6b5b4f', textDecoration: 'none' },
};
