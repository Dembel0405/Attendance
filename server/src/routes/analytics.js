const router = require('express').Router();
const db = require('../database/db');

function analyzeStudent(studentId) {
  const student = db.prepare(`
    SELECT s.*, g.name as group_name
    FROM students s LEFT JOIN groups g ON s.group_id = g.id
    WHERE s.id = ?
  `).get(studentId);

  if (!student) return null;

  const records = db.prepare(
    'SELECT * FROM attendance WHERE student_id = ? ORDER BY date ASC'
  ).all(studentId);

  if (!records.length) {
    return {
      id: student.id, name: student.name,
      group_name: student.group_name, group_id: student.group_id,
      totalDays: 0, presentDays: 0, absentDays: 0,
      attendanceRate: 0, riskLevel: 'unknown',
      consecutiveAbsences: 0, trend: 'insufficient_data',
      trendDiff: 0, recommendation: 'Нет данных о посещаемости.',
    };
  }

  const totalDays   = records.length;
  const presentDays = records.filter(r => r.status === 'present').length;
  const absentDays  = totalDays - presentDays;
  const attendanceRate = Math.round((presentDays / totalDays) * 1000) / 10;

  const riskLevel = attendanceRate >= 80 ? 'low'
                  : attendanceRate >= 50 ? 'medium'
                  : 'high';

  // Max consecutive absences
  let maxConsecutive = 0, current = 0;
  for (const r of records) {
    if (r.status === 'absent') { current++; maxConsecutive = Math.max(maxConsecutive, current); }
    else current = 0;
  }

  // Trend analysis (need >= 6 records for meaningful split)
  let trend = 'stable', trendDiff = 0;
  if (records.length >= 6) {
    const mid = Math.floor(records.length / 2);
    const firstHalf  = records.slice(0, mid);
    const secondHalf = records.slice(mid);
    const r1 = firstHalf.filter(r => r.status === 'present').length  / firstHalf.length  * 100;
    const r2 = secondHalf.filter(r => r.status === 'present').length / secondHalf.length * 100;
    trendDiff = Math.round((r2 - r1) * 10) / 10;
    if (trendDiff < -15) trend = 'worsening';
    else if (trendDiff > 15) trend = 'improving';
  }

  const parts = [];
  if (riskLevel === 'high')   parts.push('Критически низкая посещаемость. Необходимо срочное вмешательство.');
  else if (riskLevel === 'medium') parts.push('Посещаемость ниже нормы. Рекомендуется беседа со студентом.');
  else parts.push('Посещаемость в норме.');
  if (maxConsecutive >= 3) parts.push(`Зафиксировано ${maxConsecutive} последовательных пропуска(-ов).`);
  if (trend === 'worsening') parts.push('Наблюдается ухудшение посещаемости.');
  else if (trend === 'improving') parts.push('Посещаемость улучшается.');

  // Weekly breakdown for sparkline
  const weekly = {};
  for (const r of records) {
    const week = r.date.substring(0, 7); // YYYY-MM
    if (!weekly[week]) weekly[week] = { month: week, present: 0, absent: 0 };
    weekly[week][r.status]++;
  }
  const monthlyStats = Object.values(weekly).map(w => ({
    ...w,
    rate: Math.round(w.present / (w.present + w.absent) * 1000) / 10,
  }));

  return {
    id: student.id, name: student.name,
    group_name: student.group_name, group_id: student.group_id,
    totalDays, presentDays, absentDays, attendanceRate,
    riskLevel, consecutiveAbsences: maxConsecutive,
    trend, trendDiff, recommendation: parts.join(' '),
    monthlyStats,
  };
}

router.get('/', (req, res) => {
  const { group_id } = req.query;
  const students = group_id
    ? db.prepare('SELECT id FROM students WHERE group_id = ?').all(group_id)
    : db.prepare('SELECT id FROM students').all();

  const results = students.map(s => analyzeStudent(s.id)).filter(Boolean);

  const withData = results.filter(r => r.totalDays > 0);
  const summary = {
    total:        results.length,
    lowRisk:      results.filter(r => r.riskLevel === 'low').length,
    mediumRisk:   results.filter(r => r.riskLevel === 'medium').length,
    highRisk:     results.filter(r => r.riskLevel === 'high').length,
    unknownRisk:  results.filter(r => r.riskLevel === 'unknown').length,
    avgAttendance: withData.length
      ? Math.round(withData.reduce((s, r) => s + r.attendanceRate, 0) / withData.length * 10) / 10
      : 0,
  };

  res.json({ students: results, summary });
});

router.get('/:id', (req, res) => {
  const result = analyzeStudent(parseInt(req.params.id));
  if (!result) return res.status(404).json({ error: 'Студент не найден' });
  res.json(result);
});

module.exports = router;
