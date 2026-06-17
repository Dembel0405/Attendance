import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon,
  CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import { groupsAPI, studentsAPI, attendanceAPI } from '../api';
import type { Group, Student, AttendanceRecord } from '../types';

const todayStr = () => new Date().toISOString().split('T')[0];

function shiftDate(dateStr: string, delta: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function JournalPage() {
  const { date: dateParam } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const date = dateParam ?? todayStr();

  const [groups, setGroups]     = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords]   = useState<Map<number, AttendanceRecord>>(new Map());
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [saving, setSaving]     = useState<Set<number>>(new Set());
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([groupsAPI.getAll(), studentsAPI.getAll()]).then(([g, s]) => {
      setGroups(g.data);
      setStudents(s.data);
    });
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await attendanceAPI.getAll({ date_from: date, date_to: date });
      const map = new Map<number, AttendanceRecord>();
      data.forEach(r => map.set(r.student_id, r));
      setRecords(map);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const goTo = (d: string) => navigate(`/journal/${d}`);

  const toggle = async (studentId: number, status: 'present' | 'absent') => {
    if (records.get(studentId)?.status === status) return;
    setSaving(prev => new Set(prev).add(studentId));
    try {
      const { data } = await attendanceAPI.create(studentId, date, status);
      setRecords(prev => new Map(prev).set(studentId, data));
    } finally {
      setSaving(prev => { const s = new Set(prev); s.delete(studentId); return s; });
    }
  };

  const visibleStudents = selectedGroup
    ? students.filter(s => s.group_id === selectedGroup)
    : students;

  const presentCount  = visibleStudents.filter(s => records.get(s.id)?.status === 'present').length;
  const absentCount   = visibleStudents.filter(s => records.get(s.id)?.status === 'absent').length;
  const unmarkedCount = visibleStudents.filter(s => !records.has(s.id)).length;

  const isToday = date === todayStr();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Журнал посещаемости</h1>
          <p className="page-subtitle capitalize">{formatDate(date)}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            className="btn btn-secondary p-2"
            onClick={() => goTo(shiftDate(date, -1))}
            title="Предыдущий день"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <input
            type="date"
            className="input w-40"
            value={date}
            max={todayStr()}
            onChange={e => e.target.value && goTo(e.target.value)}
          />
          <button
            className="btn btn-secondary p-2"
            onClick={() => goTo(shiftDate(date, 1))}
            disabled={isToday}
            title="Следующий день"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          {!isToday && (
            <button className="btn btn-secondary text-xs" onClick={() => goTo(todayStr())}>
              Сегодня
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Пришли',       count: presentCount,  cls: 'text-green-600', dot: 'bg-green-500' },
          { label: 'Не пришли',    count: absentCount,   cls: 'text-red-600',   dot: 'bg-red-500' },
          { label: 'Не отмечены',  count: unmarkedCount, cls: 'text-slate-500', dot: 'bg-slate-300' },
        ].map(({ label, count, cls, dot }) => (
          <div key={label} className="card py-3 px-5 flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
            <div>
              <div className={`text-xl font-bold ${cls}`}>{count}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Group tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedGroup(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedGroup === null
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Все ({students.length})
        </button>
        {groups.map(g => (
          <button
            key={g.id}
            onClick={() => setSelectedGroup(g.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedGroup === g.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {g.name} ({g.student_count})
          </button>
        ))}
      </div>

      {/* Students */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
            {selectedGroup
              ? groups.find(g => g.id === selectedGroup)?.name
              : 'Все студенты'}
            {' '}({visibleStudents.length})
          </h2>
          {visibleStudents.length > 0 && !loading && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Пришёл
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block ml-2" /> Не пришёл
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block ml-2" /> Не отмечен
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm p-6">Загрузка...</p>
        ) : visibleStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <CalendarDaysIcon className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">Студентов нет.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleStudents.map((s, i) => {
              const record   = records.get(s.id);
              const isSaving = saving.has(s.id);
              const initials = s.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
              const avatarBg =
                record?.status === 'present' ? 'bg-green-500'
                : record?.status === 'absent'  ? 'bg-red-500'
                : 'bg-slate-300';

              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-4 px-6 py-3 hover:bg-slate-50/70 transition-colors ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <span className="text-slate-400 text-xs w-6 flex-shrink-0 text-right">{i + 1}</span>

                  <div className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 transition-colors`}>
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/students/${s.id}`}
                      className="font-medium text-slate-800 hover:text-blue-600 hover:underline text-sm"
                    >
                      {s.name}
                    </Link>
                    {s.group_name && !selectedGroup && (
                      <span className="ml-2 badge bg-indigo-50 text-indigo-700 text-[11px]">
                        {s.group_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggle(s.id, 'present')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        record?.status === 'present'
                          ? 'bg-green-500 border-green-500 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-green-400 hover:text-green-600'
                      }`}
                    >
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      Пришёл
                    </button>
                    <button
                      onClick={() => toggle(s.id, 'absent')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        record?.status === 'absent'
                          ? 'bg-red-500 border-red-500 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-red-400 hover:text-red-600'
                      }`}
                    >
                      <XCircleIcon className="w-3.5 h-3.5" />
                      Не пришёл
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
