import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '../components/ThemeToggle';
import { api } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api.forgotPassword(email);
      setSubmitted(true);
      setResetUrl(result.reset_url || null);
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error?.message || 'Permintaan reset password gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <ThemeToggle className="auth-theme-toggle" />
      <div className="auth-card max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Lupa Password</h1>
          <p className="text-gray-500 mt-2">Masukkan email akun untuk menerima link reset.</p>
        </div>

        {submitted ? (
          <div className="p-4 bg-green-50 text-green-800 rounded-lg text-sm text-center">
            <p>{resetUrl ? 'Mode development aktif. Gunakan tombol berikut untuk mengganti password.' : 'Jika email terdaftar, link reset password telah dikirim. Periksa juga folder spam.'}</p>
            {resetUrl && (
              <Link to={resetUrl.replace(/^https?:\/\/[^/]+/, '')} className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Buka Halaman Reset Password
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@example.com"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-blue-600 hover:underline font-medium">Kembali ke login</Link>
        </div>
      </div>
    </div>
  );
}
