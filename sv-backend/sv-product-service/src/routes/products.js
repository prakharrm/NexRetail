// Product routes for CRUD, multi-photo, and similarity search
import { Router } from 'express';
import { query } from '../db.js';
import upload from '../middleware/upload.js';
import { generateEmbedding, isModelReady } from '../services/embeddings.js';
import { toSql as pgvectorToSql } from 'pgvector';

const router = Router();

// POST /api/products — Create a new product
// Expects form data with name, price, sku, images, etc.
router.post('/', upload.array('images', 10), async (req, res) => {
  try {
    const { name, price, sku, stock, barcode, imageTypes: imageTypesRaw } = req.body;

    // Also handle single 'image' field for backward compat
    // (multer.array doesn't catch 'image', so we add a fallback route below)

    // Validation
    if (!name || !price || !sku) {
      return res.status(400).json({ error: 'name, price, and sku are required' });
    }

    // Parse image types if provided
    let imageTypes = [];
    if (imageTypesRaw) {
      try {
        imageTypes = JSON.parse(imageTypesRaw);
      } catch {
        imageTypes = [];
      }
    }

    const files = req.files || [];
    const primaryImageUrl = files.length > 0 ? `/uploads/${files[0].filename}` : null;

    // Generate embedding from the first image for the products table (backward compat)
    let primaryEmbedding = null;
    if (files.length > 0 && isModelReady()) {
      console.log(`\nGenerating embedding for "${name}" (primary image)...`);
      const start = Date.now();
      primaryEmbedding = await generateEmbedding(files[0].path);
      console.log(`    Primary embedding: ${primaryEmbedding?.length} dims in ${Date.now() - start}ms`);
    }

    // Insert product
    const result = await query(
      `INSERT INTO products (name, price, sku, stock, barcode, image_url, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, price, sku, stock, barcode, image_url, created_at`,
      [
        name,
        parseFloat(price),
        sku,
        parseInt(stock) || 0,
        barcode || null,
        primaryImageUrl,
        primaryEmbedding ? pgvectorToSql(Array.from(primaryEmbedding)) : null,
      ]
    );

    const product = result.rows[0];

    // Insert all images into product_images table
    if (files.length > 0 && isModelReady()) {
      console.log(`    Processing ${files.length} image(s) for product_images...`);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageUrl = `/uploads/${file.filename}`;
        const imageType = imageTypes[i] || 'product';

        let embedding = null;
        // Skip embedding for barcode images (they don't embed well with visual models)
        if (imageType !== 'barcode') {
          if (i === 0 && primaryEmbedding) {
            // Reuse the primary embedding we already generated
            embedding = primaryEmbedding;
          } else {
            const start = Date.now();
            embedding = await generateEmbedding(file.path);
            console.log(`    Image ${i + 1}/${files.length} (${imageType}): ${embedding?.length} dims in ${Date.now() - start}ms`);
          }
        } else {
          console.log(`    Image ${i + 1}/${files.length} (barcode): skipping embedding`);
        }

        await query(
          `INSERT INTO product_images (product_id, image_url, image_type, embedding)
           VALUES ($1, $2, $3, $4)`,
          [
            product.id,
            imageUrl,
            imageType,
            embedding ? pgvectorToSql(Array.from(embedding)) : null,
          ]
        );
      }
    } else if (files.length > 0) {
      // Model not ready — store images without embeddings
      for (let i = 0; i < files.length; i++) {
        const imageUrl = `/uploads/${files[i].filename}`;
        const imageType = imageTypes[i] || 'product';
        await query(
          `INSERT INTO product_images (product_id, image_url, image_type, embedding)
           VALUES ($1, $2, $3, NULL)`,
          [product.id, imageUrl, imageType]
        );
      }
    }

    console.log(`   Product "${name}" saved (id: ${product.id}, images: ${files.length})\n`);
    res.status(201).json(product);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A product with this SKU already exists' });
    }
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Backward-compatible single image upload
router.post('/single', upload.single('image'), async (req, res) => {
  // Convert single file to array format and forward
  if (req.file) {
    req.files = [req.file];
  }
  // Re-dispatch to the main handler
  const { name, price, sku, stock, barcode } = req.body;

  if (!name || !price || !sku) {
    return res.status(400).json({ error: 'name, price, and sku are required' });
  }

  let embedding = null;
  let imageUrl = null;

  if (req.file) {
    imageUrl = `/uploads/${req.file.filename}`;
    if (isModelReady()) {
      embedding = await generateEmbedding(req.file.path);
    }
  }

  try {
    const result = await query(
      `INSERT INTO products (name, price, sku, stock, barcode, image_url, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, price, sku, stock, barcode, image_url, created_at`,
      [
        name,
        parseFloat(price),
        sku,
        parseInt(stock) || 0,
        barcode || null,
        imageUrl,
        embedding ? pgvectorToSql(Array.from(embedding)) : null,
      ]
    );

    const product = result.rows[0];

    // Also insert into product_images
    if (req.file) {
      await query(
        `INSERT INTO product_images (product_id, image_url, image_type, embedding)
         VALUES ($1, $2, 'product', $3)`,
        [
          product.id,
          imageUrl,
          embedding ? pgvectorToSql(Array.from(embedding)) : null,
        ]
      );
    }

    res.status(201).json(product);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A product with this SKU already exists' });
    }
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// GET /api/products — List all products with images
router.get('/', async (_req, res) => {
  try {
    // Fetch products
    const productResult = await query(
      `SELECT id, name, price, sku, stock, barcode, image_url, created_at
       FROM products
       ORDER BY created_at DESC`
    );

    // Fetch all product images
    const imageResult = await query(
      `SELECT product_id, id, image_url, image_type, created_at
       FROM product_images
       ORDER BY created_at ASC`
    );

    // Group images by product_id
    const imagesByProduct = {};
    for (const img of imageResult.rows) {
      if (!imagesByProduct[img.product_id]) {
        imagesByProduct[img.product_id] = [];
      }
      imagesByProduct[img.product_id].push({
        id: img.id,
        image_url: img.image_url,
        image_type: img.image_type,
      });
    }

    const products = productResult.rows.map((row) => ({
      ...row,
      images: imagesByProduct[row.id] || [],
    }));

    res.json(products);
  } catch (err) {
    console.error('Error listing products:', err);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

// GET /api/products/:id — Get a single product
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, price, sku, stock, barcode, image_url, created_at
       FROM products WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];

    // Fetch associated images
    const imageResult = await query(
      `SELECT id, image_url, image_type FROM product_images WHERE product_id = $1 ORDER BY created_at ASC`,
      [product.id]
    );
    product.images = imageResult.rows;

    res.json(product);
  } catch (err) {
    console.error('Error getting product:', err);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// DELETE /api/products/:id — Delete a product
router.delete('/:id', async (req, res) => {
  try {
    // product_images are auto-deleted by ON DELETE CASCADE
    const result = await query(
      'DELETE FROM products WHERE id = $1 RETURNING id, name',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: `Product "${result.rows[0].name}" deleted` });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST /api/products/search — Find similar products by embedding
router.post('/search', async (req, res) => {
  try {
    const { embedding, limit = 5 } = req.body;

    if (!embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ error: 'embedding array is required' });
    }

    // Search against product_images for better multi-photo matching
    // Group by product, taking the best (highest similarity) match
    const result = await query(
      `SELECT DISTINCT ON (p.id)
              p.id, p.name, p.price, p.sku, p.stock, p.barcode, p.image_url,
              1 - (pi.embedding <=> $1) AS similarity
       FROM product_images pi
       JOIN products p ON p.id = pi.product_id
       WHERE pi.embedding IS NOT NULL
       ORDER BY p.id, pi.embedding <=> $1
       LIMIT $2`,
      [pgvectorToSql(embedding), Math.min(parseInt(limit), 20)]
    );

    // Re-sort by similarity descending (DISTINCT ON requires ORDER BY p.id first)
    const sorted = result.rows.sort((a, b) => b.similarity - a.similarity);

    res.json(sorted);
  } catch (err) {
    console.error('Error searching products:', err);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

// POST /api/products/search-image — Find similar products by image upload
router.post('/search-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    if (!isModelReady()) {
      return res.status(503).json({ error: 'ML Model not ready yet' });
    }

    const { limit = 5, threshold = 0.3 } = req.body;

    console.log(`\nSearch-Image: Generating embedding...`);
    const start = Date.now();
    const embedding = await generateEmbedding(req.file.path);
    console.log(`    Embedding generated (${embedding.length} dims) in ${Date.now() - start}ms`);

    // Search product_images — find the best-matching image per product
    const result = await query(
      `WITH ranked AS (
         SELECT
           p.id, p.name, p.price, p.sku, p.stock, p.barcode, p.image_url,
           1 - (pi.embedding <=> $1) AS similarity,
           ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY pi.embedding <=> $1) AS rn
         FROM product_images pi
         JOIN products p ON p.id = pi.product_id
         WHERE pi.embedding IS NOT NULL
       )
       SELECT id, name, price, sku, stock, barcode, image_url, similarity
       FROM ranked
       WHERE rn = 1 AND similarity >= $3
       ORDER BY similarity DESC
       LIMIT $2`,
      [pgvectorToSql(Array.from(embedding)), Math.min(parseInt(limit), 20), parseFloat(threshold)]
    );

    console.log(`    Found ${result.rows.length} matches (threshold: ${threshold})`);
    if (result.rows.length > 0) {
      console.log(`    Best match: "${result.rows[0].name}" (${(result.rows[0].similarity * 100).toFixed(1)}%)`);
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error searching products by image:', err);
    res.status(500).json({ error: 'Failed to search products by image' });
  }
});

export default router;
