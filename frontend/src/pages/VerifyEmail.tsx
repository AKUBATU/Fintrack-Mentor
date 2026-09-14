import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { api } from '../services/api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? 'Memverifikasi email…' : 'Link verifikasi tidak lengkap.');

  useEffect(() => {
    if (!token) return;
    api.verifyEmail(token)
      .then((result) => { setState('success'); setMessage(result.message); })
      .catch((error) => { setState('error'); setMessage(error instanceof Error ? error.message : 'Verifikasi email gagal.'); });
  }, [token]);

  return <main className="auth-shell min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <ThemeToggle className="auth-theme-toggle" />
    <section className="auth-card max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      {state === 'loading' ? <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-blue-600" /> : state === 'success' ? <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /> : <XCircle className="mx-auto h-12 w-12 text-red-600" />}
      <h1 className="mt-5 text-2xl font-bold text-gray-900">{state === 'success' ? 'Email terverifikasi' : state === 'loading' ? 'Verifikasi email' : 'Verifikasi gagal'}</h1>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
      <Link to="/login" className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">Ke halaman login</Link>
    </section>
  </main>;
}
