import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { groupsAPI, analyticsAPI } from '../api';
import type { Group, AnalyticsResponse, StudentAnalytics } from '../types';

const RISK_LABEL: Record<string, string> = {
  low: 'Низкий', medium: 'Средний', high: 'Высокий', unknown: 'Нет данных',
};
const RISK_COLOR: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  unknown: 'bg-slate-100 text-slate-600',
};

function TrendIcon({ trend }: { trend: StudentAnalytics['trend'] }) {
  if (trend === 'improving') return <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" title="Улучшение" />;
  if (trend === 'worsening') return <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" title="Ухудшение" />;
  if (trend === 'stable')    return <MinusIcon className="w-4 h-4 text-slate-400" title="Стабильно" />;
  return <span className="text-slate-400 text-xs">—</span>;
}

function rateColor(rate: number) {
  return rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600';
}

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [group, setGroup]       = useState<Group | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sortBy, setSortBy]     = useState<'name' | 'rate' | 'risk'>('name');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      groupsAPI.getById(parseInt(id)),
      analyticsAPI.getAll(parseInt(id)),
    ]).then(([g, a]) => {
      setGroup(g.data);
      setAnalytics(a.data);
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Загрузка группы...</p>
      </div>
    );
  }

  if (notFound || !group || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">Группа не найдена.</p>
        <button className="btn-secondary" onClick={() => navigate('/groups')}>
          <ArrowLeftIcon className="w-4 h-4" /> К группам
        </button>
      </div>
    );
  }

  const students = analytics.students;
  const summary  = analytics.summary;

  const sorted = [...students].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'ru');
    if (sortBy === 'rate') return b.attendanceRate - a.attendanceRate;
    const order: Record<string, number> = { high: 0, medium: 1, low: 2, unknown: 3 };
    return (order[a.riskLevel] ?? 3) - (order[b.riskLevel] ?? 3);
  });

  const barData = [...students]
    .filter(s => s.totalDays > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    .map(s => ({
      name: s.name.split(' ').slice(0, 2).join(' '),
      rate: s.attendanceRate,
      id: s.id,
    }));

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Link
        to="/groups"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" /> Все группы
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <UserGroupIcon className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{group.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Создана {new Date(group.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Студентов',      value: summary.total,          cls: 'text-slate-800' },
          { label: 'Ср. посещаемость', value: `${summary.avgAttendance}%`, cls: rateColor(summary.avgAttendance) },
          { label: 'Низкий риск',    value: summary.lowRisk,        cls: 'text-green-600' },
          { label: 'Средний риск',   value: summary.mediumRisk,     cls: 'text-yellow-600' },
          { label: 'Высокий риск',   value: summary.highRisk,       cls: 'text-red-600' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="card py-3 text-center">
            <div className={`text-2xl font-bold ${cls}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {barData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-1">Посещаемость по студентам, %</h2>
          <p className="text-xs text-slate-400 mb-4">Зелёный ≥ 80%, жёлтый ≥ 50%, красный &lt; 50%</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => [`${v}%`, 'Посещаемость']} />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {barData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.rate >= 80 ? '#10b981' : entry.rate >= 50 ? '#f59e0b' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Students table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <AcademicCapIcon className="w-4 h-4 text-slate-400" />
            Студенты группы ({students.length})
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Сортировка:</span>
            {(['name', 'rate', 'risk'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  sortBy === s
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {s === 'name' ? 'По имени' : s === 'rate' ? 'По посещаемости' : 'По риску'}
              </button>
            ))}
          </div>
        </div>

        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <AcademicCapIcon className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">В группе нет студентов.</p>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-none">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>ФИО</th>
                  <th>Посещаемость</th>
                  <th>Пропуски</th>
                  <th>Подряд</th>
                  <th>Риск</th>
                  <th>Тренд</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="text-slate-400 w-10 text-xs">{i + 1}</td>
                    <td>
                      <Link
                        to={`/students/${s.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td>
                      <span className={`font-semibold ${rateColor(s.attendanceRate)}`}>
                        {s.totalDays > 0 ? `${s.attendanceRate}%` : '—'}
                      </span>
                      {s.totalDays > 0 && (
                        <span className="text-xs text-slate-400 ml-1">
                          ({s.presentDays}/{s.totalDays})
                        </span>
                      )}
                    </td>
                    <td>
                      {s.absentDays > 0
                        ? <span className="text-red-600 font-medium">{s.absentDays}</span>
                        : <span className="text-slate-400">0</span>}
                    </td>
                    <td>
                      {s.consecutiveAbsences > 0
                        ? <span className={`font-medium ${s.consecutiveAbsences >= 5 ? 'text-red-600' : s.consecutiveAbsences >= 3 ? 'text-yellow-600' : 'text-slate-600'}`}>
                            {s.consecutiveAbsences} д.
                          </span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td>
                      <span className={`badge ${RISK_COLOR[s.riskLevel]}`}>
                        {RISK_LABEL[s.riskLevel]}
                      </span>
                    </td>
                    <td>
                      <TrendIcon trend={s.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
