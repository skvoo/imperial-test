/**
 * API: одна новость imperial по slug (для открытия полного текста).
 * Требуется DATABASE_URL_IMPERIAL в окружении.
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { rewriteImperialMediaUrl } from '@/lib/imperial-storage-url';

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
      `SELECT id, slug, title_en, title_ru, excerpt_en, excerpt_ru, content_en, content_ru, image, published, created_at, updated_at, tags
       FROM public.news
       WHERE published = true AND slug = $1
       LIMIT 1`,
      [slug]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const r = rows[0] as Record<string, unknown>;
    return NextResponse.json({
      id: r.id,
      slug: r.slug,
      title_en: r.title_en,
      title_ru: r.title_ru,
      excerpt_en: r.excerpt_en,
      excerpt_ru: r.excerpt_ru,
      content_en: r.content_en,
      content_ru: r.content_ru,
      image: rewriteImperialMediaUrl(r.image as string | null) ?? r.image,
      published: r.published,
      created_at: r.created_at,
      updated_at: r.updated_at,
      tags: r.tags,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Database error', details: String((e as Error).message) },
      { status: 500 }
    );
  }
}
