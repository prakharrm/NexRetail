// ────────────────────────────────────────────────────────────
// Re-embed existing products with the new feature extractor
// ────────────────────────────────────────────────────────────
// After switching from the classifier model (1000-dim logits)
// to the feature extractor (1280-dim features), existing
// embeddings are invalid. This script:
//
// 1. Loads the new model
// 2. Finds all products with images
// 3. Re-generates embeddings using the feature extractor
// 4. Updates both products.embedding and product_images.embedding
// 5. Creates product_images rows for products that don't have them
//
// Run with: node --experimental-modules scripts/re-embed.js
//   or:     npm run re-embed
// ────────────────────────────────────────────────────────────

import { query } from '../src/db.js';
import { loadModel, generateEmbedding, isModelReady } from '../src/services/embeddings.js';
import { toSql as pgvectorToSql } from 'pgvector';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'src', 'uploads');

async function main() {
  console.log('Re-embedding all products with new feature extractor...\n');

  // Load the model
  const loaded = await loadModel();
  if (!loaded || !isModelReady()) {
    console.error('Failed to load model. Run the conversion script first.');
    process.exit(1);
  }

  // Get all products with images
  const { rows: products } = await query(
    `SELECT id, name, image_url FROM products WHERE image_url IS NOT NULL ORDER BY id`
  );

  console.log(`Found ${products.length} products with images.\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    const imageFileName = product.image_url.replace('/uploads/', '');
    const imagePath = path.join(uploadsDir, imageFileName);

    if (!fs.existsSync(imagePath)) {
      console.log(`  [SKIP] Product ${product.id} "${product.name}" — image not found: ${imageFileName}`);
      errorCount++;
      continue;
    }

    try {
      const start = Date.now();
      const embedding = await generateEmbedding(imagePath);

      if (!embedding) {
        console.log(`  [SKIP] Product ${product.id} "${product.name}" — embedding generation returned null`);
        errorCount++;
        continue;
      }

      const embeddingSql = pgvectorToSql(Array.from(embedding));

      // Update products.embedding
      await query(
        `UPDATE products SET embedding = $1 WHERE id = $2`,
        [embeddingSql, product.id]
      );

      // Check if product_images entry exists
      const existing = await query(
        `SELECT id FROM product_images WHERE product_id = $1 AND image_url = $2`,
        [product.id, product.image_url]
      );

      if (existing.rows.length > 0) {
        // Update existing product_images row
        await query(
          `UPDATE product_images SET embedding = $1 WHERE product_id = $2 AND image_url = $3`,
          [embeddingSql, product.id, product.image_url]
        );
      } else {
        // Create product_images row
        await query(
          `INSERT INTO product_images (product_id, image_url, image_type, embedding)
           VALUES ($1, $2, 'product', $3)`,
          [product.id, product.image_url, embeddingSql]
        );
      }

      const duration = Date.now() - start;
      console.log(`  [OK] Product ${product.id} "${product.name}" — ${embedding.length} dims in ${duration}ms`);
      successCount++;
    } catch (err) {
      console.error(`  [ERROR] Product ${product.id} "${product.name}":`, err.message);
      errorCount++;
    }
  }

  console.log(`\nDone! ${successCount} re-embedded, ${errorCount} errors.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Re-embedding failed:', err.message);
  process.exit(1);
});
