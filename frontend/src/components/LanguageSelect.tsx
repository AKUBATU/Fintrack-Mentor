import { Languages } from 'lucide-react';
import { useLanguage, type Language } from '../contexts/LanguageContext';

export default function LanguageSelect({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const { language, setLanguage, t } = useLanguage();
  return <label className={`language-select ${compact ? 'language-select-compact' : ''} ${className}`}>
    <Languages className="h-4 w-4 shrink-0" />
    <span className={compact ? 'sr-only' : 'text-sm font-medium'}>{t('language.label')}</span>
    <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t('language.label')}>
      <option value="id">ID</option><option value="en">EN</option>
    </select>
  </label>;
}
