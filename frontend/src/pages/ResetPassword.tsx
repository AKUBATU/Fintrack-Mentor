import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '../components/ThemeToggle';
import { api } from '../services/api';
import ProcessingOverlay from '../components/ProcessingOverlay';
import LanguageSelect from '../components/LanguageSelect';
import { useLanguage } from '../contexts/LanguageContext';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      toast.error(t('register.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      const result = await api.resetPassword(token, password);
      toast.success(result.message);
      navigate('/login');
    } catch (error: any) {
      toast.error(error?.message || t('reset.failed'));
    } finally {
      setLoading(false);
    }
  };

  const passwordInput = (
    value: string,
    setValue: (value: string) => void,
    visible: boolean,
    setVisible: (value: boolean) => void,
    label: string,
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="••••••••"
          minLength={6}
          required
        />
        <button type="button" onClick={() => setVisible(!visible)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700" aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}>
          {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="auth-shell min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {loading && <ProcessingOverlay message={t('reset.loading')} />}
      <LanguageSelect compact className="auth-language-select" />
      <ThemeToggle className="auth-theme-toggle" />
      <div className="auth-card max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <img src="/fintrack-mark.svg" alt="Logo FinTrack" className="inline-block w-16 h-16 mb-4 rounded-2xl shadow-lg" />
          <h1 className="text-3xl font-bold text-gray-900">{t('reset.title')}</h1>
        </div>

        {!token ? (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg text-sm text-center">
            {t('reset.invalid')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {passwordInput(password, setPassword, showPassword, setShowPassword, t('reset.new'))}
            {passwordInput(confirmation, setConfirmation, showConfirmation, setShowConfirmation, t('reset.confirm'))}
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              <span className="inline-flex items-center justify-center gap-2">{loading && <LoaderCircle className="w-4 h-4 animate-spin" />}{loading ? t('reset.saving') : t('reset.save')}</span>
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-blue-600 hover:underline font-medium">{t('forgot.back')}</Link>
        </div>
      </div>
    </div>
  );
}
