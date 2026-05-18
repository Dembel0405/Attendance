const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../database/db');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

const NAME_COLS   = ['name', 'имя', 'фио', 'студент', 'student', 'full_name'];
const GROUP_COLS  = ['group', 'группа', 'group_name', 'группа/класс'];
const STATUS_COLS = ['status', 'статус', 'присутствие', 'attendance'];
const DATE_COLS   = ['date', 'дата', 'date_of_attendance', 'дата занятия'];

function findCol(headers, aliases) {
  for (const alias of aliases) {
    const found = headers.find(h => String(h).toLowerCase().trim() === alias.toLowerCase());
    if (found) return found;
  }
  return null;
}

function normalizeStatus(raw) {
  const s = String(raw ?? '').toLowerCase().trim();
  if (['present', 'присутствовал', 'присутствует', 'присутствие', '1', 'да', 'yes', '+', 'п'].includes(s)) return 'present';
  if (['absent', 'отсутствовал', 'отсутствует', 'отсутствие', '0', 'нет', 'no', '-', 'о'].includes(s)) return 'absent';
  return null;
}

function normalizeDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(raw).trim();
  const ddmmyyyy = str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });

  try {
    const workbook = XLSX.readFile(req.file.path, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Excel-файл пуст' });
    }

    const headers = Object.keys(rows[0]);
    const nameCol   = findCol(headers, NAME_COLS);
    const groupCol  = findCol(headers, GROUP_COLS);
    const statusCol = findCol(headers, STATUS_COLS);
    const dateCol   = findCol(headers, DATE_COLS);

    if (!nameCol || !statusCol || !dateCol) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Отсутствуют обязательные столбцы. Ожидаются: name/Имя, status/Статус, date/Дата',
        found: headers,
      });
    }

    const doImport = db.transaction(() => {
      const created = { groups: 0, students: 0, attendance: 0 };
      let skipped = 0;
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name      = String(row[nameCol] ?? '').trim();
        const groupName = groupCol ? String(row[groupCol] ?? '').trim() : null;
        const statusRaw = row[statusCol];
        const dateRaw   = row[dateCol];

        if (!name) { skipped++; continue; }

        const status = normalizeStatus(statusRaw);
        if (!status) {
          errors.push(`Строка ${i + 2}: недопустимый статус "${statusRaw}"`);
          continue;
        }

        const date = normalizeDate(dateRaw);
        if (!date) {
          errors.push(`Строка ${i + 2}: недопустимая дата "${dateRaw}"`);
          continue;
        }

        let groupId = null;
        if (groupName) {
          let group = db.prepare('SELECT id FROM groups WHERE name = ?').get(groupName);
          if (!group) {
            const r = db.prepare('INSERT INTO groups (name) VALUES (?)').run(groupName);
            groupId = r.lastInsertRowid;
            created.groups++;
          } else {
            groupId = group.id;
          }
        }

        let student = db.prepare('SELECT id FROM students WHERE name = ? AND group_id IS ?').get(name, groupId);
        if (!student) {
          const r = db.prepare('INSERT INTO students (name, group_id) VALUES (?, ?)').run(name, groupId);
          student = { id: r.lastInsertRowid };
          created.students++;
        }

        db.prepare('INSERT OR REPLACE INTO attendance (student_id, date, status) VALUES (?, ?, ?)').run(student.id, date, status);
        created.attendance++;
      }

      return { created, skipped, errors };
    });

    const result = doImport();
    fs.unlinkSync(req.file.path);

    res.json({ success: true, message: 'Импорт завершён успешно', ...result });
  } catch (err) {
    try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
