// Database connection pool using pg library for PostgreSQL

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the connection on startup
pool.on('error', (err) => {
  console.error(' Unexpected database error:', err);
  process.exit(1);
});

/**
 * Run a SQL query with parameters to prevent SQL injection.
 * Usage: const { rows } = await query('SELECT * FROM products WHERE id = $1', [id]);
 */
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log(`  📊 Query (${duration}ms): ${text.substring(0, 80)}...`);
  return result;
}

export default pool;
