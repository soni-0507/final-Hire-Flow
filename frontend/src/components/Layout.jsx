import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth.js';
import { useTheme } from '../store/theme.js';
import { initials } from '../lib/format.js';
import CommandPalette from './CommandPalette.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/candidates', label: 'Candidates' },
  { to: '/pipeline', label: 'Pipeline', roles: ['recruiter'] },
  { to: '/interviews', label: 'Interviews' },
  { to: '/feedback', label: 'Feedback' },
  { to: '/activity', label: 'Activity', roles: ['recruiter'] },
];

const ICONS = {
  '/': 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
  '/candidates': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  '/pipeline': 'M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v6h-4z',
  '/interviews': 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  '/feedback': 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  '/activity': 'M22 12h-4l-3 9L9 3l-3 9H2',
};

function ThemeToggle() {
  const { mode, toggle } = useTheme();
  return (
    <button onClick={toggle} className="btn-secondary btn-sm" aria-label="Toggle dark mode" title="Toggle dark mode">
      {mode === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // a meaningful browser-tab title for every page
  useEffect(() => {
    const match = NAV.find((n) => (n.end ? location.pathname === '/' : location.pathname.startsWith(n.to)));
    document.title = `${match ? match.label : 'Candidate'} · Hiring Pipeline`;
  }, [location.pathname]);
  const links = NAV.filter((n) => !n.roles || n.roles.includes(user.role));

  // close the mobile drawer on navigation
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <p className="font-display text-xl font-bold text-stone-900 dark:text-stone-50">Hiring Pipeline</p>
        <p className="muted mt-0.5 text-xs capitalize">{user.role} workspace</p>
      </div>
      <div className="px-3 pb-3">
        <button onClick={() => setSearchOpen(true)} className="flex w-full items-center justify-between rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800">
          <span>Search candidates</span>
          <kbd className="rounded border border-stone-300 px-1.5 text-xs dark:border-stone-600">Ctrl K</kbd>
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-200'
                  : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
              }`
            }
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONS[l.to]} />
            </svg>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-stone-200 p-4 dark:border-stone-800">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{initials(user.name)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="muted truncate text-xs">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ThemeToggle />
          <button onClick={logout} className="btn-secondary btn-sm flex-1">Log out</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-stone-200 bg-surface dark:border-stone-800 dark:bg-surface-dark lg:block">
        {sidebar}
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-surface px-4 py-3 dark:border-stone-800 dark:bg-surface-dark lg:hidden">
        <p className="font-display text-lg font-bold">Hiring Pipeline</p>
        <button onClick={() => setOpen(true)} className="btn-secondary btn-sm" aria-label="Open menu">Menu</button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-stone-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-surface shadow-xl dark:bg-surface-dark">{sidebar}</aside>
        </div>
      )}

      {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} />}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="stagger mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
