import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { authAPI } from '../api';
import './LoginPage.css';

type Mode = 'login' | 'register';

const FEATURES: [string, string][] = [
  ['Импорт из Excel',    'Автоматическое создание групп и записей посещаемости'],
  ['AI-аналитика',       'Определение уровня академического риска по динамике'],
  ['Журнал посещаемости','Цветовая индикация, фильтрация по группам и датам'],
];

export default function LoginPage() {
  const [mode, setMode]         = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = mode === 'login' ? authAPI.login : authAPI.register;
      const { data } = await fn(username.trim(), password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => (m === 'login' ? 'register' : 'login'));
    setError('');
    setUsername('');
    setPassword('');
    setShowPwd(false);
  };

  return (
    <div className="lp-root">

      {/* ── Left branding panel ── */}
      <aside className="lp-left">
        <div className="lp-logo">
          <img src="/img/LogNewWhite.png" alt="Логотип" />
        </div>

        <h1 className="lp-tagline">
          Актюбинский высший<br />политехнический колледж
        </h1>
        <p className="lp-desc">
          Система автоматизированного учёта посещаемости студентов с аналитикой академических рисков
        </p>

        <div className="lp-features">
          {FEATURES.map(([title, desc]) => (
            <div key={title} className="lp-feature">
              <div className="lp-feature-bar" />
              <div>
                <div className="lp-feature-title">{title}</div>
                <div className="lp-feature-desc">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="lp-copy">© 2026 Актбинский Высший политехнический колледж</div>
      </aside>

      {/* ── Right form panel ── */}
      <main className="lp-right">
        <div className="lp-form-area">

          {/* Mobile logo */}
          <div className="lp-mobile-logo">
            <img src="/img/LogNewWhite.png" alt="Логотип" />
            <span>Ақтөбе МТК</span>
          </div>

          <h2 className="lp-title">
            {mode === 'login' ? 'Вход в систему' : 'Регистрация'}
          </h2>
          <p className="lp-subtitle">
            {mode === 'login'
              ? 'Введите имя пользователя и пароль'
              : 'Заполните поля для создания аккаунта'}
          </p>



          {error && (
            <div className="lp-error">
              <ExclamationCircleIcon className="lp-error-icon" />
              {error}
            </div>
          )}

          <form key={mode} className="lp-form" onSubmit={submit}>
            <div className="lp-fields">

              <div className="lp-field">
                <label className="lp-label">Имя пользователя</label>
                <div className="lp-input-wrap">
                  <input
                    className="lp-input"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="admin"
                    required
                    autoFocus
                    autoComplete="username"
                  />
                  <span className="lp-field-icon">
                    <UserIcon style={{ width: 16, height: 16 }} />
                  </span>
                </div>
              </div>

              <div className="lp-field">
                <label className="lp-label">Пароль</label>
                <div className="lp-input-wrap">
                  <input
                    className="lp-input"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    className="lp-eye-btn"
                    onClick={() => setShowPwd(s => !s)}
                    tabIndex={-1}
                    aria-label={showPwd ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPwd
                      ? <EyeSlashIcon style={{ width: 16, height: 16 }} />
                      : <EyeIcon      style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" className="lp-btn" disabled={loading}>
              <span className="lp-btn-inner">
                {loading && <span className="lp-spinner" />}
                {loading
                  ? 'Загрузка...'
                  : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
              </span>
            </button>
          </form>

          <p className="lp-switch">
            {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
            <button className="lp-switch-btn" onClick={switchMode}>
              {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
