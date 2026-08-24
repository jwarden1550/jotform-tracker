const { sql, ensureSchema } = require('../../lib/schema');

module.exports = async (req, res) => {
  await ensureSchema();

  if (req.method === 'GET') {
    const q = req.query.q;
    let rows;
    if (q) {
      const like = `%${q}%`;
      rows = (await sql`
        SELECT * FROM forms
        WHERE title ILIKE ${like} OR url ILIKE ${like} OR notes ILIKE ${like} OR tags ILIKE ${like}
        ORDER BY viewed_at DESC
      `).rows;
    } else {
      rows = (await sql`SELECT * FROM forms ORDER BY viewed_at DESC`).rows;
    }
    return res.json(rows);
  }

  if (req.method === 'POST') {
    const { title, url, notes = '', tags = '', status = 'viewed' } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url is required' });
    const finalTitle = title || url;

    const existing = (await sql`SELECT id FROM forms WHERE url = ${url}`).rows[0];
    if (existing) {
      const updated = (await sql`
        UPDATE forms SET
          title = ${finalTitle},
          notes = CASE WHEN ${notes} != '' THEN ${notes} ELSE notes END,
          tags = CASE WHEN ${tags} != '' THEN ${tags} ELSE tags END,
          status = ${status},
          viewed_at = now()
        WHERE id = ${existing.id}
        RETURNING *
      `).rows[0];
      return res.json(updated);
    }

    const inserted = (await sql`
      INSERT INTO forms (title, url, notes, tags, status)
      VALUES (${finalTitle}, ${url}, ${notes}, ${tags}, ${status})
      RETURNING *
    `).rows[0];
    return res.json(inserted);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method Not Allowed');
};
