const { sql, ensureSchema } = require('../../lib/schema');

module.exports = async (req, res) => {
  await ensureSchema();

  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM pos ORDER BY created_at DESC`).rows;
    return res.json(rows);
  }

  if (req.method === 'POST') {
    const po_number = (req.body && req.body.po_number || '').trim();
    if (!po_number) return res.status(400).json({ error: 'po_number is required' });

    const existing = (await sql`SELECT id FROM pos WHERE po_number = ${po_number}`).rows[0];
    if (existing) return res.status(409).json({ error: 'PO already recorded' });

    const inserted = (await sql`
      INSERT INTO pos (po_number) VALUES (${po_number}) RETURNING *
    `).rows[0];
    return res.json(inserted);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method Not Allowed');
};
