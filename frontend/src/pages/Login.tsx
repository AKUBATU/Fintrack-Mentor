import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import ProcessingOverlay from '../components/ProcessingOverlay';
import { api } from '../services/api';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!email) return toast.error('Masukkan email terlebih dahulu');
    setResending(true);
    try {
      const result = await api.resendVerification(email);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Email verifikasi gagal dikirim ulang');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {loading && <ProcessingOverlay message="Sedang masuk ke akun…" />}
      <ThemeToggle className="auth-theme-toggle" />
      <div className="max-w-md w-full min-w-0">
        <div className="auth-card bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <img src="/fintrack-mark.svg" alt="Logo FinTrack" className="inline-block w-16 h-16 mb-4 rounded-2xl shadow-lg" />
            <h1 className="text-3xl font-bold text-gray-900">FinTrack Mentor</h1>
            <p className="text-gray-500 mt-2">Lanjutkan mengelola keuangan Anda</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
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
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  Lupa password?
                </Link>
              </div>
              <button type="button" disabled={resending} onClick={() => void resendVerification()} className="mt-2 text-sm text-gray-500 hover:text-blue-600 disabled:opacity-50">{resending ? 'Mengirim ulang…' : 'Belum menerima email verifikasi?'}</button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <span className="inline-flex items-center justify-center gap-2">{loading && <LoaderCircle className="w-4 h-4 animate-spin" />}{loading ? 'Memproses...' : 'Masuk'}</span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Belum punya akun?{' '}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">
                Daftar di sini
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
