import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersIcon, ExclamationTriangleIcon, CheckCircleIcon,
  ChartBarIcon, ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { analyticsAPI, groupsAPI, attendanceAPI } from '../api';
import type { AnalyticsResponse, Group, AttendanceRecord } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  to?: string;
}

function StatCard({ title, value, sub, icon: Icon, accent, to }: StatCardProps) {
  const inner = (
    <div className={`card-sm flex flex-col gap-3 ${to ? 'hover:border-gray-300 transition-colors cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-gray-500">{title}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: accent + '18' }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
      </div>
      <div>
        <p className="text-[26px] font-semibold text-gray-900 tracking-tight leading-none">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

const CHART_TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid #E5E7EB',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  fontSize: 12,
};

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [groups, setGroups]       = useState<Group[]>([]);
  const [recent, setRecent]       = useState<AttendanceRecord[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getAll(),
      groupsAPI.getAll(),
      attendanceAPI.getAll(),
    ]).then(([a, g, r]) => {
      setAnalytics(a.data);
      setGroups(g.data);
      setRecent(r.data.slice(0, 8));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[13px] text-gray-400">Загрузка...</div>
      </div>
    );
  }

  const summary  = analytics?.summary;
  const students = analytics?.students ?? [];

  const groupBarData = groups.map(g => {
    const gs = students.filter(s => s.group_id === g.id && s.totalDays > 0);
    const avg = gs.length
      ? Math.round(gs.reduce((s, r) => s + r.attendanceRate, 0) / gs.length * 10) / 10
      : 0;
    return { name: g.name, avg, count: gs.length };
  }).filter(d => d.count > 0);

  const pieData = [
    { name: 'Норма (≥80%)',    value: summary?.lowRisk    ?? 0, color: '#10B981' },
    { name: 'Под наблюд.',     value: summary?.mediumRisk ?? 0, color: '#F59E0B' },
    { name: 'Высокий риск',    value: summary?.highRisk   ?? 0, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const atRisk = students
    .filter(s => s.riskLevel === 'high' || (s.riskLevel === 'medium' && s.trend === 'worsening'))
    .sort((a, b) => a.attendanceRate - b.attendanceRate)
    .slice(0, 6);

  const username = localStorage.getItem('username') ?? '';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="page-title">Добро пожаловать, {username}</h1>
        <p className="page-subtitle">Общая сводка системы мониторинга посещаемости</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Всего студентов"   value={summary?.total ?? 0}
          sub="в системе" icon={UsersIcon}              accent="#2563EB" to="/students" />
        <StatCard title="Высокий риск"      value={summary?.highRisk ?? 0}
          sub="посещ. < 50%" icon={ExclamationTriangleIcon} accent="#EF4444" to="/analytics" />
        <StatCard title="В норме"           value={summary?.lowRisk ?? 0}
          sub="посещ. ≥ 80%" icon={CheckCircleIcon}        accent="#10B981" to="/analytics" />
        <StatCard title="Ср. посещаемость"  value={`${summary?.avgAttendance ?? 0}%`}
          icon={ChartBarIcon} accent="#8B5CF6" to="/analytics" />
      </div>

      {/* Charts */}
      {(groupBarData.length > 0 || pieData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {groupBarData.length > 0 && (
            <div className="card lg:col-span-3">
              <p className="text-[13px] font-semibold text-gray-800 mb-0.5">Посещаемость по группам</p>
              <p className="text-[11px] text-gray-400 mb-5">Средний % за весь период</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={groupBarData} margin={{ left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(v: any) => [`${v}%`, 'Посещаемость']}
                    cursor={{ fill: '#F9FAFB' }}
                  />
                  <Bar dataKey="avg" radius={[5, 5, 0, 0]} maxBarSize={48}>
                    {groupBarData.map((e, i) => (
                      <Cell key={i} fill={e.avg >= 80 ? '#10B981' : e.avg >= 50 ? '#F59E0B' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {pieData.length > 0 && (
            <div className="card lg:col-span-2">
              <p className="text-[13px] font-semibold text-gray-800 mb-0.5">Распределение рисков</p>
              <p className="text-[11px] text-gray-400 mb-2">По уровню посещаемости</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={52} outerRadius={78}
                       dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(v: any, n: any) => [`${v} чел.`, n]} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => <span style={{ fontSize: 11, color: '#6B7280' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* At-risk students */}
        {atRisk.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-semibold text-gray-800">Требуют внимания</p>
              <Link to="/analytics" className="text-[12px] text-blue-600 hover:text-blue-700">
                Смотреть все
              </Link>
            </div>
            <div className="space-y-1">
              {atRisk.map(s => (
                <div key={s.id}
                     className="flex items-center justify-between px-3 py-2.5 rounded-lg
                                hover:bg-gray-50 transition-colors -mx-3">
                  <div className="min-w-0">
                    <Link to={`/students/${s.id}`}
                          className="text-[13px] font-medium text-blue-600 hover:underline truncate block">
                      {s.name}
                    </Link>
                    <p className="text-[11px] text-gray-400 mt-0.5">{s.group_name ?? 'Без группы'}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
                    <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full"
                           style={{ width: `${s.attendanceRate}%` }} />
                    </div>
                    <span className="text-[12px] font-semibold text-red-600 w-9 text-right tabular-nums">
                      {s.attendanceRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent records */}
        {recent.length > 0 ? (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-semibold text-gray-800">Последние записи</p>
              <Link to="/attendance" className="text-[12px] text-blue-600 hover:text-blue-700">
                Смотреть все
              </Link>
            </div>
            <div className="space-y-1">
              {recent.map(r => (
                <div key={r.id}
                     className="flex items-center justify-between px-3 py-2.5 rounded-lg
                                hover:bg-gray-50 transition-colors -mx-3">
                  <div className="min-w-0">
                    <Link to={`/students/${r.student_id}`}
                          className="text-[13px] font-medium text-blue-600 hover:underline truncate block">
                      {r.student_name}
                    </Link>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {r.group_name ?? '—'} · {new Date(r.date + 'T00:00:00').toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <span className={`badge flex-shrink-0 ml-3 ${
                    r.status === 'present' ? 'badge-low' : 'badge-high'
                  }`}>
                    {r.status === 'present' ? 'Присутствовал' : 'Отсутствовал'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
              <ArrowUpTrayIcon className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-[13px] font-medium text-gray-600">Нет данных о посещаемости</p>
            <p className="text-[12px] text-gray-400 mt-1 mb-4">Импортируйте Excel-файл для начала</p>
            <Link to="/import" className="btn-primary text-[12px] h-8 px-3">
              Импортировать
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
