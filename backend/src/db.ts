import { Pool } from "pg";

import { config } from "./config";
import { categories, products } from "./seed";
import { usageLogSchema } from "./usageLog";

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ...(config.PGSSL === "true" ? { ssl: true } : {}),
});

// Khi PostgreSQL khởi động lại, kết nối đang rảnh trong pool bị ngắt và pool phát sự kiện "error".
// Không có listener thì Node coi là lỗi chưa xử lý và tắt cả server. Ghi log để pool tự tạo kết nối mới.
pool.on("error", (error) => {
  console.error("PostgreSQL pool error (idle client):", error.message);
});

const schema = `
  ${usageLogSchema}
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT
  );
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    price BIGINT NOT NULL CHECK (price >= 0),
    unit TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    image_url TEXT NOT NULL,
    rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    description TEXT NOT NULL,
    specs JSONB NOT NULL DEFAULT '[]'::jsonb,
    colors TEXT[] NOT NULL DEFAULT '{}',
    sizes TEXT[] NOT NULL DEFAULT '{}',
    featured BOOLEAN NOT NULL DEFAULT FALSE
  );
  CREATE TABLE IF NOT EXISTS designs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    original_image_path TEXT NOT NULL,
    original_image_type TEXT NOT NULL,
    result_image_url TEXT NOT NULL,
    room_type TEXT NOT NULL,
    style TEXT NOT NULL,
    color_theme TEXT,
    prompt TEXT,
    status TEXT NOT NULL CHECK (status IN ('processing', 'done', 'failed')),
    error_message TEXT,
    is_saved BOOLEAN NOT NULL DEFAULT FALSE,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE
  );
  CREATE INDEX IF NOT EXISTS designs_user_created_idx ON designs(user_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS design_products (
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    usage TEXT NOT NULL,
    PRIMARY KEY (design_id, product_id, usage)
  );
  CREATE TABLE IF NOT EXISTS quote_requests (
    id UUID PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

export const initializeDatabase = async (): Promise<void> => {
  await pool.query(schema);

  for (const category of categories) {
    await pool.query(
      "INSERT INTO categories (id, label) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
      [category.id, category.label],
    );
  }

  for (const product of products) {
    await pool.query(
      `INSERT INTO products
        (id, name, brand, price, unit, category_id, image_url, rating, review_count,
         description, specs, colors, sizes, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO NOTHING`,
      [
        product.id,
        product.name,
        product.brand,
        product.price,
        product.unit,
        product.categoryId,
        product.imageUrl,
        product.rating,
        product.reviewCount,
        product.description,
        JSON.stringify(product.specs),
        product.colors,
        product.sizes,
        product.featured,
      ],
    );
  }
};
