/**
 * API: список продуктов imperial из БД imperialdb (Pigsty).
 * Query: search (по name), category_id, page, per_page (default 12).
 * Ответ: { items: Product[], total: number } при наличии page/per_page, иначе массив (обратная совместимость).
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { rewriteImperialProductImages } from '@/lib/imperial-storage-url';
import { productsHasCategoryIdColumn } from '@/lib/imperial-products-schema';

const pool = process.env.DATABASE_URL_IMPERIAL
  ? new Pool({ connectionString: process.env.DATABASE_URL_IMPERIAL })
  : null;

function mapRow(r: Record<string, unknown>) {
  return {
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
  };
}

export async function GET(req: Request) {
  if (!pool) {
    return NextResponse.json(
      { error: 'DATABASE_URL_IMPERIAL not configured' },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() || '';
  const categoryId = searchParams.get('category_id');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get('per_page') || '12', 10)));

  const usePagination = searchParams.has('page') || searchParams.has('per_page');

  try {
    const hasCategoryCol = await productsHasCategoryIdColumn(pool);

    let where = '1=1';
    const params: (string | number)[] = [];
    let idx = 1;

    if (search) {
      where += ` AND p.name ILIKE $${idx}`;
      params.push(`%${search}%`);
      idx++;
    }
    if (
      hasCategoryCol &&
      categoryId !== null &&
      categoryId !== '' &&
      !Number.isNaN(Number(categoryId))
    ) {
      where += ` AND p.category_id = $${idx}`;
      params.push(Number(categoryId));
      idx++;
    }

    if (usePagination) {
      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS total FROM public.products p WHERE ${where}`,
        params
      );
      const total = (countRes.rows[0] as { total: number }).total;

      const offset = (page - 1) * perPage;
      params.push(perPage, offset);
      const { rows } = await pool.query(
        `SELECT p.* FROM public.products p WHERE ${where} ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        params
      );
      return NextResponse.json({
        items: rows.map((r: Record<string, unknown>) => mapRow(r)),
        total,
        page,
        per_page: perPage,
      });
    }

    const { rows } = await pool.query(
      `SELECT * FROM public.products p WHERE ${where} ORDER BY p.created_at DESC`,
      params
    );
    return NextResponse.json(rows.map((r: Record<string, unknown>) => mapRow(r)));
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Database error', details: String((e as Error).message) },
      { status: 500 }
    );
  }
}
