const { sql, ensureSchema } = require('../../lib/schema');

module.exports = async (req, res) => {
  await ensureSchema();
  const id = req.query.id;

  if (req.method === 'PUT') {
    const existing = (await sql`SELECT * FROM forms WHERE id = ${id}`).rows[0];
    if (!existing) return res.status(404).json({ error: 'not found' });
    const { title, url, notes, tags, status } = req.body || {};
    const updated = (await sql`
      UPDATE forms SET
        title = ${title ?? existing.title},
        url = ${url ?? existing.url},
        notes = ${notes ?? existing.notes},
        tags = ${tags ?? existing.tags},
        status = ${status ?? existing.status}
      WHERE id = ${id}
      RETURNING *
    `).rows[0];
    return res.json(updated);
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM forms WHERE id = ${id}`;
    return res.json({ ok: true });
  }

  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).end('Method Not Allowed');
};
