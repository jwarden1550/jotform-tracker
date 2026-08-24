const { sql, ensureSchema } = require('../../lib/schema');

module.exports = async (req, res) => {
  await ensureSchema();
  const id = req.query.id;

  if (req.method === 'DELETE') {
    await sql`DELETE FROM pos WHERE id = ${id}`;
    return res.json({ ok: true });
  }

  res.setHeader('Allow', 'DELETE');
  return res.status(405).end('Method Not Allowed');
};
