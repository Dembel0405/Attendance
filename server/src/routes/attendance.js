const router = require('express').Router();
const db = require('../database/db');

router.get('/', (req, res) => {
  const { group_id, student_id, date_from, date_to } = req.query;
  let query = `
    SELECT a.*, s.name as student_name, g.name as group_name, g.id as group_id
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    LEFT JOIN groups g ON s.group_id = g.id
    WHERE 1=1
  `;
  const params = [];
  if (group_id)   { query += ' AND g.id = ?';       params.push(group_id); }
  if (student_id) { query += ' AND a.student_id = ?'; params.push(student_id); }
  if (date_from)  { query += ' AND a.date >= ?';     params.push(date_from); }
  if (date_to)    { query += ' AND a.date <= ?';     params.push(date_to); }
  query += ' ORDER BY a.date DESC, s.name ASC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { student_id, date, status } = req.body;
  if (!student_id || !date || !['present', 'absent'].includes(status)) {
    return res.status(400).json({ error: 'student_id, date и корректный status обязательны' });
  }
  try {
    const result = db.prepare(
      'INSERT OR REPLACE INTO attendance (student_id, date, status) VALUES (?, ?, ?)'
    ).run(student_id, date, status);
    const record = db.prepare(`
      SELECT a.*, s.name as student_name, g.name as group_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
