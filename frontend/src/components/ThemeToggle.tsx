import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('fintrack_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <button
      type="button"
      onClick={() => setDarkMode((enabled) => !enabled)}
      className={`app-icon-button theme-toggle ${className}`}
      aria-label={darkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={darkMode ? 'Mode terang' : 'Mode gelap'}
    >
      {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
