/**
 * API: один продукт imperial по slug (для страницы /product/[slug]).
 * Требуется DATABASE_URL_IMPERIAL в окружении.
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { rewriteImperialProductImages } from '@/lib/imperial-storage-url';

const pool = process.env.DATABASE_URL_IMPERIAL
  ? new Pool({ connectionString: process.env.DATABASE_URL_IMPERIAL })
  : null;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'Slug required' }, { status: 400 });
  }
  if (!pool) {
    return NextResponse.json(
      { error: 'DATABASE_URL_IMPERIAL not configured' },
      { status: 503 }
    );
  }
  try {
    const { rows } = await pool.query(
      `SELECT * FROM public.products WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const r = rows[0] as Record<string, unknown>;
    return NextResponse.json({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      category_id: r.category_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
      price: r.price,
      image_urls: rewriteImperialProductImages(
        r.image_urls ?? r.images ?? r.image ?? null
      ),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Database error', details: String((e as Error).message) },
      { status: 500 }
    );
  }
}
