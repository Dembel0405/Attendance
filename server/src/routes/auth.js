const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password) {
    return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
  }
  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username.trim(), hash);
    const token = jwt.sign({ id: result.lastInsertRowid, username: username.trim() }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, username: username.trim() });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Пользователь с таким именем уже существует' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверные учётные данные' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

// Get current user info
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, role, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(user);
});

// Change username
router.put('/profile', authMiddleware, (req, res) => {
  const { username } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Имя пользователя обязательно' });
  if (username.trim().length < 3) return res.status(400).json({ error: 'Минимум 3 символа' });
  if (username.trim().length > 50) return res.status(400).json({ error: 'Максимум 50 символов' });
  try {
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username.trim(), req.user.id);
    const token = jwt.sign({ id: req.user.id, username: username.trim() }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: username.trim() });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Это имя уже занято' });
    res.status(500).json({ error: err.message });
  }
});

// Change password
router.put('/password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Текущий и новый пароль обязательны' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Новый пароль должен содержать минимум 6 символов' });
  }
  if (newPassword.length > 100) {
    return res.status(400).json({ error: 'Пароль слишком длинный' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный текущий пароль' });
  }
  if (bcrypt.compareSync(newPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Новый пароль совпадает с текущим' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

module.exports = router;
