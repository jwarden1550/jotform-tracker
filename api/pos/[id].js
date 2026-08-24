const { sql, ensureSchema } = require('../../lib/schema');

module.exports = async (req, res) => {
  await ensureSchema();
  const id = req.query.id;

  if (req.method === 'PUT') {
    const vendor = (req.body && req.body.vendor || '').trim() || null;
    const updated = (await sql`
      UPDATE pos SET vendor = ${vendor} WHERE id = ${id} RETURNING *
    `).rows[0];
    if (!updated) return res.status(404).json({ error: 'not found' });
    return res.json(updated);
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM pos WHERE id = ${id}`;
    return res.json({ ok: true });
  }

  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).end('Method Not Allowed');
};
