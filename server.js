const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'jotforms.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    notes TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    status TEXT DEFAULT 'viewed',
    viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/forms', (req, res) => {
  const { q } = req.query;
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db.prepare(
      `SELECT * FROM forms WHERE title LIKE ? OR url LIKE ? OR notes LIKE ? OR tags LIKE ? ORDER BY viewed_at DESC`
    ).all(like, like, like, like);
  } else {
    rows = db.prepare(`SELECT * FROM forms ORDER BY viewed_at DESC`).all();
  }
  res.json(rows);
});

app.post('/api/forms', (req, res) => {
  const { title, url, notes = '', tags = '', status = 'viewed' } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  const finalTitle = title || url;
  const existing = db.prepare('SELECT id FROM forms WHERE url = ?').get(url);
  if (existing) {
    db.prepare(
      `UPDATE forms SET title = ?, notes = CASE WHEN ? != '' THEN ? ELSE notes END, tags = CASE WHEN ? != '' THEN ? ELSE tags END, status = ?, viewed_at = datetime('now') WHERE id = ?`
    ).run(finalTitle, notes, notes, tags, tags, status, existing.id);
    return res.json(db.prepare('SELECT * FROM forms WHERE id = ?').get(existing.id));
  }
  const info = db.prepare(
    `INSERT INTO forms (title, url, notes, tags, status) VALUES (?, ?, ?, ?, ?)`
  ).run(finalTitle, url, notes, tags, status);
  res.json(db.prepare('SELECT * FROM forms WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/forms/:id', (req, res) => {
  const { title, url, notes, tags, status } = req.body;
  const existing = db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  db.prepare(
    `UPDATE forms SET title = ?, url = ?, notes = ?, tags = ?, status = ? WHERE id = ?`
  ).run(
    title ?? existing.title,
    url ?? existing.url,
    notes ?? existing.notes,
    tags ?? existing.tags,
    status ?? existing.status,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id));
});

app.delete('/api/forms/:id', (req, res) => {
  db.prepare('DELETE FROM forms WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4173;
app.listen(PORT, () => console.log(`JotForm tracker running at http://localhost:${PORT}`));
