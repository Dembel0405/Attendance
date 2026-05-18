import { useState, useEffect, FormEvent } from 'react';
import {
  KeyIcon, ShieldCheckIcon,
  CheckCircleIcon, ExclamationCircleIcon, PencilIcon,
  EyeIcon, EyeSlashIcon, CalendarDaysIcon, IdentificationIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { authAPI } from '../api';
import type { UserProfile } from '../api';

// Decode JWT payload without a library
function decodeToken(): { id: number; username: string; iat?: number } | null {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

interface AlertProps { type: 'success' | 'error'; message: string; }

function Alert({ type, message }: AlertProps) {
  return (
    <div className={`flex items-center gap-2.5 p-3 rounded-lg text-sm mt-3 ${
      type === 'success'
        ? 'bg-green-50 border border-green-200 text-green-700'
        : 'bg-red-50 border border-red-200 text-red-700'
    }`}>
      {type === 'success'
        ? <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
        : <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />}
      {message}
    </div>
  );
}

function PasswordInput({
  value, onChange, placeholder, id,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; id: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        className="input pr-10"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: 'Минимум 6 символов',     ok: password.length >= 6 },
    { label: 'Заглавная буква',         ok: /[A-ZА-Я]/.test(password) },
    { label: 'Цифра',                   ok: /\d/.test(password) },
    { label: 'Спецсимвол (!@#$…)',      ok: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];
  const passed = checks.filter(c => c.ok).length;
  const [bar, label] =
    passed <= 1 ? ['bg-red-500',    'Слабый'] :
    passed === 2 ? ['bg-yellow-500', 'Средний'] :
    passed === 3 ? ['bg-blue-500',   'Хороший'] :
                   ['bg-green-500',  'Отличный'];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${passed * 25}%` }} />
        </div>
        <span className="text-xs text-slate-500 w-14">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1 text-xs ${c.ok ? 'text-green-600' : 'text-slate-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.ok ? 'bg-green-500' : 'bg-slate-300'}`} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  // Read base info immediately from localStorage + JWT (no API needed)
  const tokenData = decodeToken();
  const storedUsername = localStorage.getItem('username') ?? 'Пользователь';

  const [profile, setProfile] = useState<UserProfile>({
    id: tokenData?.id ?? 0,
    username: storedUsername,
    role: 'admin',
    created_at: '',
  });
  const [newUsername, setNewUsername] = useState(storedUsername);
  const [usernameAlert, setUsernameAlert] = useState<AlertProps | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd]         = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [passwordAlert, setPasswordAlert] = useState<AlertProps | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Try to enrich profile from API (non-blocking — page works without it)
  useEffect(() => {
    authAPI.me()
      .then(({ data }) => {
        setProfile(data);
        setNewUsername(data.username);
      })
      .catch(() => {
        // Server may not be restarted yet — silently keep localStorage data
      });
  }, []);

  const handleUsernameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed === profile.username) return;
    if (trimmed.length < 3) {
      setUsernameAlert({ type: 'error', message: 'Минимум 3 символа' });
      return;
    }
    setSavingUsername(true);
    setUsernameAlert(null);
    try {
      const { data } = await authAPI.updateProfile(trimmed);
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      setProfile(prev => ({ ...prev, username: data.username }));
      setNewUsername(data.username);
      setUsernameAlert({ type: 'success', message: 'Имя успешно изменено.' });
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      setUsernameAlert({ type: 'error', message: err.response?.data?.error ?? 'Ошибка при сохранении' });
    } finally {
      setSavingUsername(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordAlert(null);
    if (newPwd !== confirmPwd) {
      setPasswordAlert({ type: 'error', message: 'Новый пароль и подтверждение не совпадают' });
      return;
    }
    if (newPwd.length < 6) {
      setPasswordAlert({ type: 'error', message: 'Пароль должен содержать минимум 6 символов' });
      return;
    }
    setSavingPassword(true);
    try {
      await authAPI.changePassword(currentPwd, newPwd);
      setPasswordAlert({ type: 'success', message: 'Пароль успешно изменён.' });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err: any) {
      setPasswordAlert({ type: 'error', message: err.response?.data?.error ?? 'Ошибка при смене пароля' });
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = profile.username.slice(0, 2).toUpperCase();
  const usernameChanged = newUsername.trim() !== profile.username && newUsername.trim().length >= 3;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Профиль</h1>
        <p className="page-subtitle">Управление учётной записью</p>
      </div>

      {/* Profile card */}
      <div className="card">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-800 truncate">{profile.username}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                {profile.role === 'admin' ? 'Администратор' : profile.role}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <IdentificationIcon className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">ID аккаунта</p>
              <p className="text-sm font-medium text-slate-700 mt-0.5">
                {profile.id ? `#${profile.id}` : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <UserCircleIcon className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Роль</p>
              <p className="text-sm font-medium text-slate-700 mt-0.5">
                {profile.role === 'admin' ? 'Администратор' : profile.role}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <CalendarDaysIcon className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Зарегистрирован</p>
              <p className="text-sm font-medium text-slate-700 mt-0.5">
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Change username */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <PencilIcon className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Изменить имя пользователя</h3>
            <p className="text-xs text-slate-500 mt-0.5">Минимум 3 символа, максимум 50</p>
          </div>
        </div>
        <form onSubmit={handleUsernameSubmit} className="space-y-3">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5">
              Новое имя пользователя
            </label>
            <div className="flex gap-3">
              <input
                id="username"
                className="input flex-1"
                type="text"
                value={newUsername}
                onChange={e => { setNewUsername(e.target.value); setUsernameAlert(null); }}
                placeholder="Введите новое имя"
                minLength={3}
                maxLength={50}
                required
              />
              <button
                type="submit"
                className="btn-primary flex-shrink-0"
                disabled={savingUsername || !usernameChanged}
              >
                {savingUsername ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
            {newUsername.trim().length > 0 && (
              <p className="text-xs text-slate-400 mt-1.5">{newUsername.trim().length} / 50 символов</p>
            )}
          </div>
          {usernameAlert && <Alert {...usernameAlert} />}
        </form>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <KeyIcon className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Изменить пароль</h3>
            <p className="text-xs text-slate-500 mt-0.5">Минимум 6 символов</p>
          </div>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPwd" className="block text-sm font-medium text-slate-700 mb-1.5">
              Текущий пароль
            </label>
            <PasswordInput
              id="currentPwd"
              value={currentPwd}
              onChange={v => { setCurrentPwd(v); setPasswordAlert(null); }}
              placeholder="Введите текущий пароль"
            />
          </div>
          <div>
            <label htmlFor="newPwd" className="block text-sm font-medium text-slate-700 mb-1.5">
              Новый пароль
            </label>
            <PasswordInput
              id="newPwd"
              value={newPwd}
              onChange={v => { setNewPwd(v); setPasswordAlert(null); }}
              placeholder="Придумайте новый пароль"
            />
            <PasswordStrength password={newPwd} />
          </div>
          <div>
            <label htmlFor="confirmPwd" className="block text-sm font-medium text-slate-700 mb-1.5">
              Подтверждение нового пароля
            </label>
            <PasswordInput
              id="confirmPwd"
              value={confirmPwd}
              onChange={v => { setConfirmPwd(v); setPasswordAlert(null); }}
              placeholder="Повторите новый пароль"
            />
            {confirmPwd && newPwd && (
              <p className={`text-xs mt-1.5 flex items-center gap-1 ${confirmPwd === newPwd ? 'text-green-600' : 'text-red-500'}`}>
                {confirmPwd === newPwd
                  ? <><CheckCircleIcon className="w-3.5 h-3.5" /> Пароли совпадают</>
                  : <><ExclamationCircleIcon className="w-3.5 h-3.5" /> Пароли не совпадают</>}
              </p>
            )}
          </div>
          {passwordAlert && <Alert {...passwordAlert} />}
          <div className="pt-1">
            <button
              type="submit"
              className="btn-primary"
              disabled={savingPassword || !currentPwd || !newPwd || !confirmPwd}
            >
              {savingPassword ? 'Сохранение...' : 'Изменить пароль'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card border-red-200 bg-red-50/30">
        <h3 className="font-semibold text-red-700 mb-1">Завершить сеанс</h3>
        <p className="text-sm text-slate-500 mb-4">
          Выйти из системы. Данные авторизации будут удалены из браузера.
        </p>
        <button
          className="btn btn-danger"
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = '/login';
          }}
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
