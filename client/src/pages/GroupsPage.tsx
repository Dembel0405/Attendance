import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, TrashIcon, UserGroupIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { groupsAPI } from '../api';
import type { Group } from '../types';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const { data } = await groupsAPI.getAll();
      setGroups(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true); setError('');
    try {
      const { data } = await groupsAPI.create(name.trim());
      setGroups(prev => [...prev, { ...data, student_count: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Ошибка при создании группы');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить группу? Студенты останутся, но потеряют привязку к группе.')) return;
    try {
      await groupsAPI.remove(id);
      setGroups(prev => prev.filter(g => g.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Ошибка при удалении');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Группы</h1>
        <p className="page-subtitle">Управление учебными группами</p>
      </div>

      {/* Add form */}
      <div className="card">
        <h2 className="text-[13px] font-semibold text-gray-700 mb-4">Добавить группу</h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            className="input max-w-xs"
            placeholder="Название группы (напр. ИС-21)"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <button className="btn-primary flex-shrink-0" disabled={adding}>
            <PlusIcon className="w-4 h-4" />
            {adding ? 'Добавление...' : 'Добавить'}
          </button>
        </form>
        {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
      </div>

      {/* Groups table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Список групп ({groups.length})</h2>
        </div>
        {loading ? (
          <p className="text-slate-500 text-sm p-6">Загрузка...</p>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <UserGroupIcon className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">Группы не найдены. Создайте первую группу.</p>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-none">
            <table>
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Студентов</th>
                  <th>Дата создания</th>
                  <th className="text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(g => (
                  <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                    <td>
                      <Link
                        to={`/groups/${g.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        {g.name}
                        <ChevronRightIcon className="w-3.5 h-3.5 opacity-50" />
                      </Link>
                    </td>
                    <td>
                      <span className="badge bg-blue-100 text-blue-800">{g.student_count}</span>
                    </td>
                    <td className="text-slate-500">{new Date(g.created_at).toLocaleDateString('ru-RU')}</td>
                    <td className="text-right flex items-center justify-end gap-2">
                      <Link
                        to={`/groups/${g.id}`}
                        className="btn btn-secondary py-1.5 px-3 text-xs"
                      >
                        Открыть
                      </Link>
                      <button
                        onClick={() => handleDelete(g.id)}
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
