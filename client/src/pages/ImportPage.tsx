import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { ArrowUpTrayIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { importAPI } from '../api';
import type { ImportResult } from '../types';

export default function ImportPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState<File | null>(null);
  const [result, setResult]     = useState<ImportResult | null>(null);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f); setResult(null); setError('');
    } else {
      setError('Поддерживаются только файлы .xlsx и .xls');
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(''); }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await importAPI.upload(file);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Ошибка при импорте файла');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(''); if (inputRef.current) inputRef.current.value = ''; };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="page-title">Импорт из Excel</h1>
        <p className="page-subtitle">Загрузите файл .xlsx для автоматического импорта данных</p>
      </div>

      {/* Format description */}
      <div className="card bg-blue-50 border-blue-200">
        <h2 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5" />
          Формат файла Excel
        </h2>
        <p className="text-blue-700 text-sm mb-3">Файл должен содержать следующие столбцы (первая строка — заголовки):</p>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="bg-blue-100">
                <th className="border border-blue-200 px-3 py-1.5 text-blue-800 font-semibold text-left">Столбец</th>
                <th className="border border-blue-200 px-3 py-1.5 text-blue-800 font-semibold text-left">Альтернативные названия</th>
                <th className="border border-blue-200 px-3 py-1.5 text-blue-800 font-semibold text-left">Пример значения</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {[
                ['name (обязательный)',   'Имя, ФИО, Студент',         'Иванов Иван Иванович'],
                ['group (необязательный)','Группа, Group_name',         'ИС-21'],
                ['status (обязательный)', 'Статус, Присутствие',       'present / absent / да / нет / + / -'],
                ['date (обязательный)',   'Дата, Date_of_attendance',   '2024-09-01 или 01.09.2024'],
              ].map(([col, alt, ex]) => (
                <tr key={col}>
                  <td className="border border-blue-100 px-3 py-1.5 font-mono text-blue-700">{col}</td>
                  <td className="border border-blue-100 px-3 py-1.5 text-slate-600">{alt}</td>
                  <td className="border border-blue-100 px-3 py-1.5 text-slate-500">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drop zone */}
      {!result && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
            dragging ? 'border-blue-400 bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          }`}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleChange} />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <DocumentTextIcon className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-slate-700">{file.name}</p>
              <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <ArrowUpTrayIcon className="w-12 h-12 text-slate-400" />
              <div>
                <p className="font-semibold text-slate-700">Перетащите файл сюда</p>
                <p className="text-sm text-slate-500 mt-1">или нажмите для выбора</p>
              </div>
              <p className="text-xs text-slate-400">.xlsx, .xls</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <XCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {file && !result && (
        <div className="flex gap-3">
          <button className="btn-primary" onClick={handleImport} disabled={loading}>
            <ArrowUpTrayIcon className="w-4 h-4" />
            {loading ? 'Импортирование...' : 'Начать импорт'}
          </button>
          <button className="btn-secondary" onClick={reset}>Отмена</button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{result.message}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Новых групп',    value: result.created.groups },
              { label: 'Новых студентов',value: result.created.students },
              { label: 'Записей посещ.', value: result.created.attendance },
              { label: 'Пропущено строк',value: result.skipped },
            ].map(({ label, value }) => (
              <div key={label} className="card text-center py-4">
                <div className="text-2xl font-bold text-slate-800">{value}</div>
                <div className="text-xs text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div className="card border-yellow-200 bg-yellow-50">
              <h3 className="font-semibold text-yellow-800 mb-2">Ошибки в строках ({result.errors.length}):</h3>
              <ul className="space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-yellow-700">{e}</li>
                ))}
              </ul>
            </div>
          )}

          <button className="btn-secondary" onClick={reset}>Импортировать ещё один файл</button>
        </div>
      )}
    </div>
  );
}
