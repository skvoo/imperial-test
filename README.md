# Imperial test (Vercel)

Минимальное Next.js-приложение для проверки подключения к **imperialdb** (PostgreSQL на Pigsty) и отображения файлов из **MinIO** при деплое на Vercel.

## Что внутри

- **`/test-imperial`** — проверка подключения к imperialdb и MinIO (счётчики таблиц, новости/продукты/события с картинками).
- **`/shop`** — список товаров из imperialdb (Pigsty), картинки с MinIO; ссылки на страницы товаров. Пример каталога как на [imperialmiami.com](https://www.imperialmiami.com).
- **`/product/[slug]`** — страница одного товара по образцу [imperialmiami.com/product/...](https://www.imperialmiami.com/product/roberto-cavalli-bird-ramage-silk-throw-2201): хлебные крошки, галерея, название, цена, описание, категория, кнопки Add to Cart / Book Consultation, блок «You may also like» с другими товарами. Данные и картинки — из imperialdb и MinIO (Pigsty).
- API: `/api/imperial/stats`, `/api/imperial/news`, `/api/imperial/products`, `/api/imperial/products/[slug]`, `/api/imperial/events`. Подключение к БД по `DATABASE_URL_IMPERIAL`.

## Локальный запуск

```bash
cp .env.example .env.local
# Заполнить DATABASE_URL_IMPERIAL в .env.local
npm install
npm run dev
```

Открыть http://localhost:3000/test-imperial

## Деплой на Vercel

1. Импортировать репозиторий в Vercel.
2. В **Settings → Environment Variables** добавить:
   - `DATABASE_URL_IMPERIAL` = `postgresql://USER:PASSWORD@104.223.25.234:6432/imperialdb`
   - (по желанию) `NEXT_PUBLIC_IMPERIAL_STORAGE_BASE` = `https://db.sharconai.com/s3` — по умолчанию уже используется в коде
3. Деплой. Открыть `https://<проект>.vercel.app/test-imperial`.

Подробная инструкция для фронтенда: [docs/FRONTEND-IMPERIAL-VERCEL-SWITCH.md](docs/FRONTEND-IMPERIAL-VERCEL-SWITCH.md).
