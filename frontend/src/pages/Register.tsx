import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import ProcessingOverlay from '../components/ProcessingOverlay';
import { toast } from 'sonner';
import LanguageSelect from '../components/LanguageSelect';
import { useLanguage } from '../contexts/LanguageContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error(t('register.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/login');
    } catch (error) {
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {loading && <ProcessingOverlay message={t('register.loading')} />}
      <LanguageSelect compact className="auth-language-select" />
      <ThemeToggle className="auth-theme-toggle" />
      <div className="max-w-md w-full min-w-0">
        <div className="auth-card bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <img src="/fintrack-mark.svg" alt="Logo FinTrack" className="inline-block w-16 h-16 mb-4 rounded-2xl shadow-lg" />
            <h1 className="text-3xl font-bold text-gray-900">FinTrack Mentor</h1>
            <p className="text-gray-500 mt-2">{t('register.subtitle')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('register.namePlaceholder')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email')}
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700" aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}>
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700" aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}>
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <span className="inline-flex items-center justify-center gap-2">{loading && <LoaderCircle className="w-4 h-4 animate-spin" />}{loading ? t('auth.processing') : t('register.submit')}</span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {t('register.hasAccount')}{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                {t('register.login')}
              </Link>
            </p>
            <p className="mt-3 text-xs leading-5 text-gray-500">
              {t('register.agreement')} <Link to="/terms" className="text-blue-600 hover:underline">{t('register.terms')}</Link> {t('register.andRead')} <Link to="/privacy" className="text-blue-600 hover:underline">{t('register.privacy')}</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
