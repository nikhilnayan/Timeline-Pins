import { MapPin, List, Upload, Settings, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Navbar({ activePage, onNavigate }) {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'map', label: 'Atlas', icon: MapPin },
    { id: 'places', label: 'Places', icon: List },
    { id: 'import', label: 'Import', icon: Upload },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-[1000] border-b border-moss-900/15 bg-parchment-50/95 backdrop-blur-md dark:border-parchment-200/15 dark:bg-moss-900/95">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:px-5">
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className="flex items-center gap-2.5 rounded-md px-1 py-1 text-left transition hover:opacity-85"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-brass-500/40 bg-moss-900 text-parchment-200 dark:bg-parchment-200 dark:text-moss-900">
            <MapPin className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden font-display text-base font-semibold tracking-tight text-moss-900 dark:text-parchment-200 sm:inline sm:text-lg">
            Timeline Pins
          </span>
        </button>

        <nav
          aria-label="Primary"
          className="flex items-center gap-0.5 rounded-lg border border-moss-900/15 bg-parchment-100/90 p-0.5 dark:border-parchment-200/15 dark:bg-moss-800 sm:gap-1"
        >
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activePage === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition sm:gap-1.5 sm:px-3 sm:text-xs ${
                  active
                    ? 'bg-moss-900 text-parchment-200 dark:bg-parchment-200 dark:text-moss-900'
                    : 'text-moss-700 hover:text-moss-900 dark:text-parchment-200/75 dark:hover:text-parchment-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-moss-900/15 bg-parchment-100 text-moss-900 transition hover:bg-parchment-200/60 dark:border-parchment-200/15 dark:bg-moss-800 dark:text-parchment-200 dark:hover:bg-moss-700"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          {user && (
            <div className="flex items-center gap-1.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User avatar'}
                  className="hidden h-8 w-8 rounded-full border border-moss-900/20 object-cover dark:border-parchment-200/25 sm:block"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="hidden h-8 w-8 items-center justify-center rounded-full border border-brass-500/40 bg-moss-800 font-mono text-xs font-semibold text-parchment-200 sm:flex">
                  {initials}
                </span>
              )}
              <button
                type="button"
                onClick={logout}
                aria-label="Sign out"
                title="Sign out"
                className="flex h-8 items-center gap-1.5 rounded-md border border-moss-900/15 bg-parchment-100 px-2.5 text-xs font-semibold text-moss-900 transition hover:bg-parchment-200/60 dark:border-parchment-200/15 dark:bg-moss-800 dark:text-parchment-200 dark:hover:bg-moss-700"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
