import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, CalendarDaysIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { attendanceAPI, groupsAPI, studentsAPI } from '../api';
import type { AttendanceRecord, Group, Student } from '../types';

export default function AttendancePage() {
  const [records, setRecords]       = useState<AttendanceRecord[]>([]);
  const [groups, setGroups]         = useState<Group[]>([]);
  const [students, setStudents]     = useState<Student[]>([]);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [loading, setLoading]       = useState(true);

  // Add form
  const [addStudent, setAddStudent] = useState('');
  const [addDate, setAddDate]       = useState(new Date().toISOString().split('T')[0]);
  const [addStatus, setAddStatus]   = useState<'present' | 'absent'>('present');
  const [adding, setAdding]         = useState(false);
  const [addError, setAddError]     = useState('');
  const [showForm, setShowForm]     = useState(false);

  useEffect(() => {
    Promise.all([groupsAPI.getAll(), studentsAPI.getAll()]).then(([g, s]) => {
      setGroups(g.data);
      setStudents(s.data);
    });
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterGroup)   params.group_id   = parseInt(filterGroup);
      if (filterStudent) params.student_id = parseInt(filterStudent);
      if (dateFrom)      params.date_from  = dateFrom;
      if (dateTo)        params.date_to    = dateTo;
      const { data } = await attendanceAPI.getAll(params);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, [filterGroup, filterStudent, dateFrom, dateTo]);

  const filteredStudents = filterGroup
    ? students.filter(s => s.group_id === parseInt(filterGroup))
    : students;

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!addStudent) { setAddError('Выберите студента'); return; }
    setAdding(true); setAddError('');
    try {
      await attendanceAPI.create(parseInt(addStudent), addDate, addStatus);
      await loadRecords();
      setShowForm(false);
    } catch (err: any) {
      setAddError(err.response?.data?.error ?? 'Ошибка при добавлении записи');
    } finally {
      setAdding(false);
    }
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount  = records.filter(r => r.status === 'absent').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Посещаемость</h1>
          <p className="page-subtitle">Журнал посещаемости студентов</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <PlusIcon className="w-4 h-4" />
          Добавить запись
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card border-blue-200 bg-blue-50/40">
          <h2 className="font-semibold text-slate-700 mb-4">Новая запись посещаемости</h2>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Студент</label>
              <select className="input w-56" value={addStudent} onChange={e => setAddStudent(e.target.value)} required>
                <option value="">— Выберите студента —</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.group_name ? `(${s.group_name})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Дата</label>
              <input className="input w-44" type="date" value={addDate} onChange={e => setAddDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Статус</label>
              <select className="input w-44" value={addStatus} onChange={e => setAddStatus(e.target.value as any)}>
                <option value="present">Присутствовал</option>
                <option value="absent">Отсутствовал</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" disabled={adding}>{adding ? 'Сохранение...' : 'Сохранить'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </form>
          {addError && <p className="mt-2 text-red-600 text-sm">{addError}</p>}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex gap-4">
        <div className="card py-3 px-5 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          <div>
            <div className="text-xl font-bold text-slate-800">{presentCount}</div>
            <div className="text-xs text-slate-500">Присутствий</div>
          </div>
        </div>
        <div className="card py-3 px-5 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
          <div>
            <div className="text-xl font-bold text-slate-800">{absentCount}</div>
            <div className="text-xs text-slate-500">Пропусков</div>
          </div>
        </div>
        <div className="card py-3 px-5 flex items-center gap-3">
          <div>
            <div className="text-xl font-bold text-slate-800">{records.length}</div>
            <div className="text-xs text-slate-500">Всего записей</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3 text-slate-600">
          <FunnelIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Фильтры</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <select className="input w-48" value={filterGroup} onChange={e => { setFilterGroup(e.target.value); setFilterStudent(''); }}>
            <option value="">Все группы</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select className="input w-56" value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
            <option value="">Все студенты</option>
            {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="input w-40" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="От" title="Дата от" />
          <input className="input w-40" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="До" title="Дата до" />
          <button className="btn-secondary" onClick={() => { setFilterGroup(''); setFilterStudent(''); setDateFrom(''); setDateTo(''); }}>
            Сбросить
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Журнал ({records.length})</h2>
        </div>
        {loading ? (
          <p className="text-slate-500 text-sm p-6">Загрузка...</p>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <CalendarDaysIcon className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">Записи не найдены.</p>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-none">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Студент</th>
                  <th>Группа</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td>
                      <Link
                        to={`/journal/${r.date}`}
                        className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </Link>
                    </td>
                    <td>
                      <Link
                        to={`/students/${r.student_id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {r.student_name}
                      </Link>
                    </td>
                    <td>
                      {r.group_name
                        ? <span className="badge bg-indigo-100 text-indigo-800">{r.group_name}</span>
                        : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {r.status === 'present' ? 'Присутствовал' : 'Отсутствовал'}
                      </span>
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
