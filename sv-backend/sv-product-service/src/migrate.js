// Database migration: Run once to set up tables (npm run migrate)
// Enables pgvector, creates products and product_images tables, and adds indexes.
import { query } from './db.js';

async function migrate() {
  console.log('Running migrations...\n');

  // Step 1: Enable pgvector
  await query('CREATE EXTENSION IF NOT EXISTS vector');
  console.log('   pgvector extension enabled');

  // Step 2: Create products table
  // The main product record. image_url stores the primary display image.
  // The embedding column on products is kept for backward compatibility
  // but new code uses product_images.embedding for multi-photo search.
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      price       NUMERIC(10,2) NOT NULL,
      sku         TEXT UNIQUE NOT NULL,
      stock       INTEGER DEFAULT 0,
      barcode     TEXT,
      image_url   TEXT,
      embedding   vector(1280),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('   products table ready');

  // Step 3: Handle embedding column dimension change
  // If the column was previously vector(1000), alter it to vector(1280).
  // This also clears existing embeddings since they're from the old model.
  try {
    const dimCheck = await query(`
      SELECT atttypmod FROM pg_attribute
      WHERE attrelid = 'products'::regclass
      AND attname = 'embedding'
    `);
    if (dimCheck.rows.length > 0) {
      const currentDim = dimCheck.rows[0].atttypmod;
      if (currentDim !== 1280 && currentDim > 0) {
        console.log(`   Embedding column is ${currentDim}-dim, migrating to 1280-dim...`);
        // Drop old indexes that reference the column
        await query('DROP INDEX IF EXISTS idx_products_embedding');
        // Alter column type
        await query('ALTER TABLE products ALTER COLUMN embedding TYPE vector(1280) USING NULL');
        console.log('   Embedding column migrated (old embeddings cleared)');
      }
    }
  } catch (err) {
    console.log('   (embedding column check skipped:', err.message, ')');
  }

  // Step 4: Create product_images table
  // Each product can have multiple images. Each image gets its own
  // embedding for visual search. When searching, we match against
  // ALL images and group results by product_id.
  await query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id          SERIAL PRIMARY KEY,
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url   TEXT NOT NULL,
      image_type  TEXT DEFAULT 'product',
      embedding   vector(1280),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('   product_images table ready');

  // Step 5: Create indexes
  // Barcode index
  await query(`
    CREATE INDEX IF NOT EXISTS idx_products_barcode
    ON products(barcode)
  `);
  console.log('   barcode index created');

  // Product images -> product_id lookup
  await query(`
    CREATE INDEX IF NOT EXISTS idx_product_images_product_id
    ON product_images(product_id)
  `);
  console.log('   product_images product_id index created');

  // Vector similarity index on product_images
  // Using ivfflat with cosine distance for fast ANN search
  try {
    await query(`
      CREATE INDEX IF NOT EXISTS idx_product_images_embedding
      ON product_images USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    console.log('   product_images vector index created');
  } catch (err) {
    // ivfflat index needs some data to build properly
    console.log('   product_images vector index skipped (needs data):', err.message);
  }

  // Legacy index on products.embedding (for backward compat)
  try {
    await query(`
      CREATE INDEX IF NOT EXISTS idx_products_embedding
      ON products USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    console.log('   products vector index created');
  } catch (err) {
    console.log('   products vector index skipped:', err.message);
  }

  console.log('\n Migration complete!\n');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
