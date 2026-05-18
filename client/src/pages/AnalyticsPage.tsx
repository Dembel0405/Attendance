import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { analyticsAPI, groupsAPI } from '../api';
import type { StudentAnalytics, AnalyticsResponse, Group } from '../types';

const RISK_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', unknown: '#94a3b8' };
const RISK_LABELS = { low: 'Низкий', medium: 'Средний', high: 'Высокий', unknown: 'Нет данных' };

function RiskBadge({ level }: { level: StudentAnalytics['riskLevel'] }) {
  return <span className={`badge-${level}`}>{RISK_LABELS[level]}</span>;
}

function TrendIcon({ trend }: { trend: StudentAnalytics['trend'] }) {
  if (trend === 'improving')    return <ArrowTrendingUpIcon   className="w-4 h-4 text-green-600" title="Улучшение" />;
  if (trend === 'worsening')    return <ArrowTrendingDownIcon className="w-4 h-4 text-red-600"   title="Ухудшение" />;
  if (trend === 'stable')       return <MinusIcon             className="w-4 h-4 text-slate-400"  title="Стабильно" />;
  return <span className="text-slate-400 text-xs">—</span>;
}

export default function AnalyticsPage() {
  const [data, setData]         = useState<AnalyticsResponse | null>(null);
  const [groups, setGroups]     = useState<Group[]>([]);
  const [filterGroup, setFilterGroup] = useState('');
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState<'name' | 'rate' | 'risk'>('risk');
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [a, g] = await Promise.all([
        analyticsAPI.getAll(filterGroup ? parseInt(filterGroup) : undefined),
        groupsAPI.getAll(),
      ]);
      setData(a.data);
      setGroups(g.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterGroup]);

  const students = data?.students ?? [];
  const summary  = data?.summary;

  const filtered = students
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ru');
      if (sortBy === 'rate') return a.attendanceRate - b.attendanceRate;
      const order: Record<string, number> = { high: 0, medium: 1, low: 2, unknown: 3 };
      return (order[a.riskLevel] ?? 3) - (order[b.riskLevel] ?? 3);
    });

  const pieData = summary ? [
    { name: 'Низкий риск',    value: summary.lowRisk,    color: RISK_COLORS.low },
    { name: 'Средний риск',   value: summary.mediumRisk, color: RISK_COLORS.medium },
    { name: 'Высокий риск',   value: summary.highRisk,   color: RISK_COLORS.high },
    { name: 'Нет данных',     value: summary.unknownRisk,color: RISK_COLORS.unknown },
  ].filter(d => d.value > 0) : [];

  const barData = filtered
    .filter(s => s.totalDays > 0)
    .slice(0, 20)
    .map(s => ({ name: s.name.split(' ').slice(0, 2).join(' '), rate: s.attendanceRate }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Аналитика</h1>
        <p className="page-subtitle">AI-анализ рисков и динамики посещаемости</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Всего студентов', value: summary.total,        color: 'text-slate-800' },
            { label: 'Низкий риск',     value: summary.lowRisk,      color: 'text-green-600' },
            { label: 'Средний риск',    value: summary.mediumRisk,   color: 'text-yellow-600' },
            { label: 'Высокий риск',    value: summary.highRisk,     color: 'text-red-600' },
            { label: 'Ср. посещаемость',value: `${summary.avgAttendance}%`, color: 'text-blue-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card py-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pieData.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-slate-700 mb-4">Распределение по уровню риска</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [`${v} студ.`, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {barData.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-slate-700 mb-4">Посещаемость студентов, %</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${v}%`, 'Посещаемость']} />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.rate >= 80 ? '#10b981' : entry.rate >= 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Table controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          className="input w-56"
          placeholder="Поиск по имени..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input w-48" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
          <option value="">Все группы</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select className="input w-48" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
          <option value="risk">Сортировать: по риску</option>
          <option value="rate">Сортировать: по посещаемости</option>
          <option value="name">Сортировать: по имени</option>
        </select>
      </div>

      {/* Analytics table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Детальный анализ ({filtered.length} студентов)</h2>
        </div>
        {loading ? (
          <p className="text-slate-500 text-sm p-6">Загрузка...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <ChartBarIcon className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">Нет данных для анализа.</p>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-none">
            <table>
              <thead>
                <tr>
                  <th>Студент</th>
                  <th>Группа</th>
                  <th>Посещ.</th>
                  <th>Риск</th>
                  <th>Пропуск подряд</th>
                  <th>Тренд</th>
                  <th>Рекомендация</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <Link
                        to={`/students/${s.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td>
                      {s.group_name
                        ? <span className="badge bg-indigo-100 text-indigo-800">{s.group_name}</span>
                        : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${s.attendanceRate}%`,
                              backgroundColor: s.attendanceRate >= 80 ? '#10b981' : s.attendanceRate >= 50 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{s.attendanceRate}%</span>
                        <span className="text-xs text-slate-400">({s.presentDays}/{s.totalDays})</span>
                      </div>
                    </td>
                    <td><RiskBadge level={s.riskLevel} /></td>
                    <td>
                      {s.consecutiveAbsences > 0
                        ? <span className={`font-semibold ${s.consecutiveAbsences >= 5 ? 'text-red-600' : s.consecutiveAbsences >= 3 ? 'text-yellow-600' : 'text-slate-600'}`}>
                            {s.consecutiveAbsences} д.
                          </span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <TrendIcon trend={s.trend} />
                        {s.trendDiff !== 0 && (
                          <span className={`text-xs ${s.trendDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {s.trendDiff > 0 ? '+' : ''}{s.trendDiff}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-xs">
                      <p className="text-xs text-slate-600 leading-relaxed">{s.recommendation}</p>
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
