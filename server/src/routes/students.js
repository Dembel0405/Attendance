const router = require('express').Router();
const db = require('../database/db');

router.get('/', (req, res) => {
  const { group_id } = req.query;
  let query = `
    SELECT s.*, g.name as group_name
    FROM students s
    LEFT JOIN groups g ON s.group_id = g.id
  `;
  const params = [];
  if (group_id) {
    query += ' WHERE s.group_id = ?';
    params.push(group_id);
  }
  query += ' ORDER BY s.name';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { name, group_id } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Имя студента обязательно' });
  try {
    const result = db.prepare('INSERT INTO students (name, group_id) VALUES (?, ?)').run(name.trim(), group_id || null);
    const student = db.prepare(`
      SELECT s.*, g.name as group_name
      FROM students s LEFT JOIN groups g ON s.group_id = g.id
      WHERE s.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Студент не найден' });
  res.json({ success: true });
});

module.exports = router;
