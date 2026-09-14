import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_STORAGE_KEY = 'fintrack_theme';

function hasSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [usesManualTheme, setUsesManualTheme] = useState(hasSavedTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (usesManualTheme) return;

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystemTheme = (event: MediaQueryListEvent) => setDarkMode(event.matches);

    setDarkMode(systemTheme.matches);
    systemTheme.addEventListener('change', followSystemTheme);
    return () => systemTheme.removeEventListener('change', followSystemTheme);
  }, [usesManualTheme]);

  const toggleTheme = () => {
    setDarkMode((enabled) => {
      const nextDarkMode = !enabled;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextDarkMode ? 'dark' : 'light');
      } catch {
        // The active theme still works when browser storage is unavailable.
      }
      return nextDarkMode;
    });
    setUsesManualTheme(true);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`app-icon-button theme-toggle ${className}`}
      aria-label={darkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={darkMode ? 'Mode terang' : 'Mode gelap'}
    >
      {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
