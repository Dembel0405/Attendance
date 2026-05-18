import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, TrashIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { studentsAPI, groupsAPI } from '../api';
import type { Student, Group } from '../types';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups]     = useState<Group[]>([]);
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [name, setName]         = useState('');
  const [groupId, setGroupId]   = useState<string>('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);

  const load = async (gid?: string) => {
    setLoading(true);
    try {
      const [s, g] = await Promise.all([
        studentsAPI.getAll(gid ? parseInt(gid) : undefined),
        groupsAPI.getAll(),
      ]);
      setStudents(s.data);
      setGroups(g.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filterGroup); }, [filterGroup]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true); setError('');
    try {
      const { data } = await studentsAPI.create(name.trim(), groupId ? parseInt(groupId) : null);
      setStudents(prev =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      );
      setName('');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Ошибка при добавлении студента');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить студента и все его записи посещаемости?')) return;
    try {
      await studentsAPI.remove(id);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Ошибка при удалении');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Студенты</h1>
        <p className="page-subtitle">Управление списком студентов</p>
      </div>

      {/* Add form */}
      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-4">Добавить студента</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
          <input
            className="input max-w-xs"
            placeholder="ФИО студента"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <select
            className="input max-w-[200px]"
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
          >
            <option value="">— Без группы —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button className="btn-primary flex-shrink-0" disabled={adding}>
            <PlusIcon className="w-4 h-4" />
            {adding ? 'Добавление...' : 'Добавить'}
          </button>
        </form>
        {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600 font-medium">Фильтр по группе:</span>
        <select
          className="input max-w-[200px]"
          value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}
        >
          <option value="">Все группы</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <span className="text-sm text-slate-400">Найдено: {students.length}</span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Список студентов</h2>
        </div>
        {loading ? (
          <p className="text-slate-500 text-sm p-6">Загрузка...</p>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <AcademicCapIcon className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">Студенты не найдены.</p>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-none">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>ФИО</th>
                  <th>Группа</th>
                  <th>Добавлен</th>
                  <th className="text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td className="text-slate-400 w-10">{i + 1}</td>
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
                    <td className="text-slate-500">{new Date(s.created_at).toLocaleDateString('ru-RU')}</td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="btn btn-danger py-1.5 px-3 text-xs"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        Удалить
                      </button>
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
