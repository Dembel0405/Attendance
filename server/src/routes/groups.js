const router = require('express').Router();
const db = require('../database/db');

router.get('/', (req, res) => {
  const groups = db.prepare(`
    SELECT g.*, COUNT(s.id) as student_count
    FROM groups g
    LEFT JOIN students s ON g.id = s.group_id
    GROUP BY g.id
    ORDER BY g.name
  `).all();
  res.json(groups);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Название группы обязательно' });
  try {
    const result = db.prepare('INSERT INTO groups (name) VALUES (?)').run(name.trim());
    const group = db.prepare('SELECT g.*, COUNT(s.id) as student_count FROM groups g LEFT JOIN students s ON g.id = s.group_id WHERE g.id = ? GROUP BY g.id').get(result.lastInsertRowid);
    res.status(201).json(group);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Группа с таким названием уже существует' });
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  const group = db.prepare(`
    SELECT g.*, COUNT(s.id) as student_count
    FROM groups g
    LEFT JOIN students s ON g.id = s.group_id
    WHERE g.id = ?
    GROUP BY g.id
  `).get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Группа не найдена' });
  res.json(group);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Группа не найдена' });
  res.json({ success: true });
});

module.exports = router;
