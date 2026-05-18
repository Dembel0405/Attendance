import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  Squares2X2Icon, UserGroupIcon, AcademicCapIcon,
  CalendarDaysIcon, ChartBarIcon, ArrowUpTrayIcon,
  ArrowRightStartOnRectangleIcon, UserCircleIcon,
} from '@heroicons/react/24/outline';

const nav = [
  { to: '/',           label: 'Главная',      Icon: Squares2X2Icon,   exact: true },
  { to: '/groups',     label: 'Группы',        Icon: UserGroupIcon },
  { to: '/students',   label: 'Студенты',      Icon: AcademicCapIcon },
  { to: '/attendance', label: 'Посещаемость',  Icon: CalendarDaysIcon },
  { to: '/analytics',  label: 'Аналитика',     Icon: ChartBarIcon },
  { to: '/import',     label: 'Импорт',        Icon: ArrowUpTrayIcon },
];

export default function Layout() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(localStorage.getItem('username') ?? '');

  useEffect(() => {
    const sync = () => setUsername(localStorage.getItem('username') ?? '');
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const initial = username ? username[0].toUpperCase() : '?';

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* ── Sidebar ── */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col" style={{ background: '#111318' }}>

        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3">
          <img src="/img/LogNewWhite.png" alt="Логотип колледжа" className="h-8 w-auto flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-white text-[13px] font-semibold leading-tight truncate">AHPC</p>
            <p className="text-zinc-500 text-[11px] leading-tight mt-0.5">Посещаемость</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-white/8" />

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
                 transition-colors duration-100 ${
                   isActive
                     ? 'bg-white/10 text-white'
                     : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 border-t border-white/8" />

        {/* User */}
        <div className="px-3 py-3 space-y-0.5">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
                       text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors w-full group"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center
                            text-white text-[11px] font-bold flex-shrink-0">
              {initial}
            </div>
            <span className="flex-1 truncate">{username}</span>
            <UserCircleIcon className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0" />
          </Link>

          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px]
                       text-zinc-500 hover:text-zinc-200 hover:bg-white/5
                       transition-colors w-full"
          >
            <ArrowRightStartOnRectangleIcon className="w-4 h-4 flex-shrink-0" />
            Выйти
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
