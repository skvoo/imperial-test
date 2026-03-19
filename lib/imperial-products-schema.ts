/**
 * Кэш: есть ли в public.products колонка category_id (в некоторых БД её нет).
 */
import type { Pool } from 'pg';

let cachedCategoryIdColumn: boolean | null = null;

export async function productsHasCategoryIdColumn(pool: Pool): Promise<boolean> {
  if (cachedCategoryIdColumn !== null) return cachedCategoryIdColumn;
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'category_id'
       LIMIT 1`
    );
    cachedCategoryIdColumn = rows.length > 0;
  } catch {
    cachedCategoryIdColumn = false;
  }
  return cachedCategoryIdColumn;
}
