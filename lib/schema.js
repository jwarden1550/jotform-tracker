const { sql } = require('@vercel/postgres');

let ensured = false;

async function ensureSchema() {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS forms (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      status TEXT DEFAULT 'viewed',
      viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pos (
      id SERIAL PRIMARY KEY,
      po_number TEXT NOT NULL UNIQUE,
      vendor TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE pos ADD COLUMN IF NOT EXISTS vendor TEXT`;
  ensured = true;
}

module.exports = { sql, ensureSchema };
