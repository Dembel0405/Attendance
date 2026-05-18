import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon, CalendarDaysIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon,
  ExclamationTriangleIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, ReferenceLine,
} from 'recharts';
import { analyticsAPI, attendanceAPI } from '../api';
import type { StudentAnalytics, AttendanceRecord } from '../types';

const RISK_LABEL: Record<string, string> = {
  low: 'Низкий', medium: 'Средний', high: 'Высокий', unknown: 'Нет данных',
};
const RISK_COLOR: Record<string, string> = {
  low: 'bg-green-100 text-green-800', medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800', unknown: 'bg-slate-100 text-slate-600',
};
const TREND_LABEL: Record<string, string> = {
  improving: 'Улучшается', stable: 'Стабильно',
  worsening: 'Ухудшается', insufficient_data: 'Недостаточно данных',
};

function TrendChip({ trend, diff }: { trend: string; diff: number }) {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold';
  if (trend === 'improving') return (
    <span className={`${base} bg-green-100 text-green-700`}>
      <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> {TREND_LABEL[trend]} {diff > 0 ? `+${diff}%` : ''}
    </span>
  );
  if (trend === 'worsening') return (
    <span className={`${base} bg-red-100 text-red-700`}>
      <ArrowTrendingDownIcon className="w-3.5 h-3.5" /> {TREND_LABEL[trend]} {diff < 0 ? `${diff}%` : ''}
    </span>
  );
  if (trend === 'stable') return (
    <span className={`${base} bg-slate-100 text-slate-600`}>
      <MinusIcon className="w-3.5 h-3.5" /> {TREND_LABEL[trend]}
    </span>
  );
  return <span className={`${base} bg-slate-100 text-slate-500`}>{TREND_LABEL[trend] ?? trend}</span>;
}

export default function StudentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [records, setRecords]     = useState<AttendanceRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      analyticsAPI.getAll().then(r => r.data.students.find(s => s.id === parseInt(id)) ?? null),
      attendanceAPI.getAll({ student_id: parseInt(id) }),
    ]).then(([a, r]) => {
      if (!a) { setNotFound(true); return; }
      setAnalytics(a);
      setRecords(r.data);
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Загрузка профиля...</p>
      </div>
    );
  }

  if (notFound || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">Студент не найден.</p>
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeftIcon className="w-4 h-4" /> Назад
        </button>
      </div>
    );
  }

  const initials = analytics.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  // Build consecutive absence runs for highlighting
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const absenceRunIndex = new Set<number>();
  let run = 0;
  for (let i = 0; i < sortedRecords.length; i++) {
    if (sortedRecords[i].status === 'absent') {
      run++;
      if (run >= 3) {
        // mark the whole run
        for (let j = i - run + 1; j <= i; j++) absenceRunIndex.add(j);
      }
    } else {
      run = 0;
    }
  }

  // Chart: monthly attendance rate
  const monthlyData = analytics.monthlyStats.map(m => ({
    month: m.month.substring(5) + '.' + m.month.substring(0, 4), // MM.YYYY
    rate: m.rate,
    present: m.present,
    absent: m.absent,
  }));

  // Chart: daily presence (1 = present, 0 = absent) for sparkline
  const dailyData = sortedRecords.slice(-30).map(r => ({
    date: r.date.substring(5), // MM-DD
    value: r.status === 'present' ? 1 : 0,
    status: r.status,
  }));

  const statColor = (rate: number) =>
    rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" /> Назад
      </button>

      {/* Header card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 ${
            analytics.riskLevel === 'high' ? 'bg-red-500'
            : analytics.riskLevel === 'medium' ? 'bg-yellow-500'
            : analytics.riskLevel === 'low' ? 'bg-green-500'
            : 'bg-slate-400'
          }`}>
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800">{analytics.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {analytics.group_name
                ? <Link
                    to="/groups"
                    className="badge bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors"
                  >
                    {analytics.group_name}
                  </Link>
                : <span className="text-slate-400 text-sm">Без группы</span>
              }
              <span className={`badge ${RISK_COLOR[analytics.riskLevel]}`}>
                Риск: {RISK_LABEL[analytics.riskLevel]}
              </span>
              <TrendChip trend={analytics.trend} diff={analytics.trendDiff} />
            </div>
          </div>
        </div>

        {/* Recommendation */}
        {analytics.recommendation && (
          <div className={`mt-4 flex items-start gap-3 p-3.5 rounded-xl text-sm ${
            analytics.riskLevel === 'high'   ? 'bg-red-50 border border-red-200 text-red-700'
            : analytics.riskLevel === 'medium' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
            : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {analytics.riskLevel === 'high' || analytics.riskLevel === 'medium'
              ? <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              : <CheckCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            }
            <p>{analytics.recommendation}</p>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Посещаемость', value: `${analytics.attendanceRate}%`, highlight: statColor(analytics.attendanceRate) },
          { label: 'Всего занятий', value: analytics.totalDays, highlight: 'text-slate-800' },
          { label: 'Присутствий', value: analytics.presentDays, highlight: 'text-green-600' },
          { label: 'Пропусков', value: analytics.absentDays, highlight: 'text-red-600' },
          { label: 'Макс. подряд', value: analytics.consecutiveAbsences > 0 ? `${analytics.consecutiveAbsences} д.` : '—',
            highlight: analytics.consecutiveAbsences >= 5 ? 'text-red-600' : analytics.consecutiveAbsences >= 3 ? 'text-yellow-600' : 'text-slate-800' },
          { label: 'Последняя запись', value: records.length > 0
              ? new Date(records[0].date + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
              : '—',
            highlight: 'text-slate-800' },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="card py-3 text-center">
            <div className={`text-xl font-bold ${highlight}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {(monthlyData.length > 0 || dailyData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly rate chart */}
          {monthlyData.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-slate-700 mb-1">Посещаемость по месяцам, %</h2>
              <p className="text-xs text-slate-400 mb-4">Процент посещений за каждый месяц</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v: any, _n: any, p: any) => [
                      `${v}% (присут.: ${p.payload.present}, пропуск: ${p.payload.absent})`,
                      'Посещаемость',
                    ]}
                  />
                  <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 2" label={{ value: '80%', fontSize: 10, fill: '#10b981', position: 'right' }} />
                  <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '50%', fontSize: 10, fill: '#ef4444', position: 'right' }} />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {monthlyData.map((entry, i) => (
                      <Cell key={i} fill={entry.rate >= 80 ? '#10b981' : entry.rate >= 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Daily presence last 30 days */}
          {dailyData.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-slate-700 mb-1">Последние {dailyData.length} записей</h2>
              <p className="text-xs text-slate-400 mb-4">1 = присутствовал, 0 = отсутствовал</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.floor(dailyData.length / 6)} />
                  <YAxis domain={[-0.1, 1.1]} ticks={[0, 1]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(_v: any, _n: any, p: any) => [
                    p.payload.status === 'present' ? 'Присутствовал' : 'Отсутствовал', 'Статус'
                  ]} />
                  <ReferenceLine y={0.5} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Line
                    type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return <circle key={cx} cx={cx} cy={cy} r={4} fill={payload.status === 'present' ? '#10b981' : '#ef4444'} stroke="white" strokeWidth={1.5} />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Attendance history */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
            История посещаемости ({records.length} записей)
          </h2>
          {records.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Присутствовал</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Отсутствовал</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-200 inline-block"></span> Серия пропусков</span>
            </div>
          )}
        </div>

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <CalendarDaysIcon className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Записей о посещаемости нет.</p>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-none">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Дата</th>
                  <th>День недели</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((r, i) => {
                  const d = new Date(r.date + 'T00:00:00');
                  const isRunAbsence = absenceRunIndex.has(i);
                  return (
                    <tr key={r.id} className={isRunAbsence ? 'bg-red-50/60' : ''}>
                      <td className="text-slate-400 w-10 text-xs">{i + 1}</td>
                      <td className="font-mono text-sm text-slate-700">
                        {d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="text-slate-500 text-sm capitalize">
                        {d.toLocaleDateString('ru-RU', { weekday: 'long' })}
                      </td>
                      <td>
                        <span className={`badge ${r.status === 'present' ? 'bg-green-100 text-green-800' : isRunAbsence ? 'bg-red-200 text-red-900' : 'bg-red-100 text-red-800'}`}>
                          {r.status === 'present' ? 'Присутствовал' : 'Отсутствовал'}
                          {isRunAbsence && r.status === 'absent' && ' (серия)'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
