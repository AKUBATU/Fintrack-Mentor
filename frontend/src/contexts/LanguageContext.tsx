import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'id' | 'en';
type Variables = Record<string, string | number>;

const STORAGE_KEY = 'fintrack_language_preference';

const id: Record<string, string> = {
  'nav.dashboard': 'Dashboard', 'nav.finance': 'Keuangan', 'nav.portfolio': 'Portofolio', 'nav.chat': 'Chat Mentor', 'nav.profile': 'Profil', 'nav.about': 'Tentang',
  'common.logout': 'Logout', 'common.loading': 'Memuat…', 'common.save': 'Simpan', 'common.cancel': 'Batal', 'common.edit': 'Edit', 'common.delete': 'Hapus', 'common.export': 'Export', 'common.close': 'Tutup',
  'layout.tagline': 'Personal wealth manager', 'layout.subtitle': 'Kelola finansial Anda dengan lebih terarah', 'layout.openMenu': 'Buka menu navigasi', 'layout.closeMenu': 'Tutup menu navigasi',
  'language.label': 'Bahasa', 'language.auto': 'Mengikuti perangkat sampai Anda memilih secara manual.', 'language.indonesian': 'Bahasa Indonesia', 'language.english': 'English',
  'auth.email': 'Email', 'auth.password': 'Password', 'auth.showPassword': 'Tampilkan password', 'auth.hidePassword': 'Sembunyikan password', 'auth.processing': 'Memproses…',
  'login.subtitle': 'Lanjutkan mengelola keuangan Anda', 'login.submit': 'Masuk', 'login.forgot': 'Lupa password?', 'login.noAccount': 'Belum punya akun?', 'login.register': 'Daftar di sini', 'login.resend': 'Belum menerima email verifikasi?', 'login.resending': 'Mengirim ulang…', 'login.enterEmail': 'Masukkan email terlebih dahulu', 'login.verificationFailed': 'Email verifikasi gagal dikirim ulang', 'login.loading': 'Sedang masuk ke akun…',
  'register.subtitle': 'Mulai catat keuangan dan investasi Anda', 'register.name': 'Nama Lengkap', 'register.namePlaceholder': 'Nama lengkap Anda', 'register.confirmPassword': 'Konfirmasi Password', 'register.submit': 'Daftar', 'register.hasAccount': 'Sudah punya akun?', 'register.login': 'Masuk di sini', 'register.passwordMismatch': 'Konfirmasi password tidak cocok', 'register.loading': 'Sedang membuat akun…', 'register.agreement': 'Dengan mendaftar, Anda menyetujui', 'register.terms': 'Ketentuan Penggunaan', 'register.privacy': 'Kebijakan Privasi', 'register.andRead': 'dan telah membaca',
  'forgot.title': 'Lupa Password', 'forgot.subtitle': 'Masukkan email akun untuk menerima link reset.', 'forgot.send': 'Kirim Link Reset', 'forgot.sending': 'Mengirim…', 'forgot.loading': 'Sedang mengirim link reset…', 'forgot.back': 'Kembali ke login', 'forgot.failed': 'Permintaan reset password gagal', 'forgot.sent': 'Jika email terdaftar, link reset password telah dikirim. Periksa juga folder spam.', 'forgot.dev': 'Mode development aktif. Gunakan tombol berikut untuk mengganti password.', 'forgot.openReset': 'Buka Halaman Reset Password',
  'reset.title': 'Buat Password Baru', 'reset.new': 'Password Baru', 'reset.confirm': 'Konfirmasi Password', 'reset.save': 'Simpan Password Baru', 'reset.saving': 'Menyimpan…', 'reset.loading': 'Sedang menyimpan password baru…', 'reset.invalid': 'Link reset tidak lengkap. Silakan minta link reset yang baru.', 'reset.failed': 'Reset password gagal',
  'verify.loading': 'Memverifikasi email…', 'verify.invalid': 'Link verifikasi tidak lengkap.', 'verify.failed': 'Verifikasi email gagal.', 'verify.successTitle': 'Email terverifikasi', 'verify.loadingTitle': 'Verifikasi email', 'verify.errorTitle': 'Verifikasi gagal', 'verify.login': 'Ke halaman login',
  'dashboard.title': 'Dashboard', 'dashboard.subtitle': 'Lihat arus kas, budget, dan investasi Anda dalam satu ringkasan.',
  'finance.title': 'Keuangan', 'finance.subtitle': 'Kelola pemasukan, pengeluaran, dan budget Anda',
  'portfolio.title': 'Portofolio', 'portfolio.subtitle': 'Pantau kepemilikan, performa, dan pendapatan investasi Anda.',
  'chat.title': 'Chat Mentor', 'profile.title': 'Profil', 'about.title': 'Tentang FinTrack',
  'chat.welcome': 'Halo! Saya Mentor Keuangan FinTrack. Saya dapat merangkum pengeluaran, kategori terbesar, portofolio, dan dividen berdasarkan data akun Anda. Apa yang ingin Anda periksa hari ini?', 'chat.subtitle': 'Ringkasan berbasis data akun, tanpa mengirim data ke layanan AI eksternal.', 'chat.private': 'Data tetap di FinTrack', 'chat.daily': 'Riwayat direset harian', 'chat.today': 'Percakapan hari ini', 'chat.context': 'Konteks mengikuti data akun terbaru', 'chat.ready': 'Siap', 'chat.loadingHistory': 'Memuat percakapan hari ini…', 'chat.thinking': 'Mentor sedang merangkum data…', 'chat.placeholder': 'Contoh: rangkum pengeluaran bulan ini', 'chat.inputLabel': 'Pesan untuk mentor', 'chat.send': 'Kirim pesan', 'chat.hint': 'Enter untuk mengirim · Shift + Enter untuk baris baru', 'chat.historyFailed': 'Riwayat percakapan hari ini gagal dimuat', 'chat.sendFailed': 'Pesan gagal dikirim. Silakan coba lagi.',
  'settings.account': 'Akun FinTrack', 'settings.subtitle': 'Kelola identitas akun dan preferensi investasi Anda.', 'settings.languageTitle': 'Bahasa & wilayah', 'settings.languageDescription': 'Pilih bahasa yang digunakan FinTrack pada perangkat ini.',
  'report.previewFinance': 'Preview Laporan Keuangan', 'report.previewPortfolio': 'Preview Laporan Portfolio', 'report.csv': 'CSV', 'report.pdf': 'Simpan PDF', 'report.monthly': 'Bulanan', 'report.yearly': 'Tahunan', 'report.all': 'Semua data', 'report.summary': 'Ringkas', 'report.detailed': 'Rinci',
};

const en: Record<string, string> = {
  'nav.dashboard': 'Dashboard', 'nav.finance': 'Finance', 'nav.portfolio': 'Portfolio', 'nav.chat': 'Mentor Chat', 'nav.profile': 'Profile', 'nav.about': 'About',
  'common.logout': 'Log out', 'common.loading': 'Loading…', 'common.save': 'Save', 'common.cancel': 'Cancel', 'common.edit': 'Edit', 'common.delete': 'Delete', 'common.export': 'Export', 'common.close': 'Close',
  'layout.tagline': 'Personal wealth manager', 'layout.subtitle': 'Manage your finances with greater clarity', 'layout.openMenu': 'Open navigation menu', 'layout.closeMenu': 'Close navigation menu',
  'language.label': 'Language', 'language.auto': 'Follows your device until you choose manually.', 'language.indonesian': 'Bahasa Indonesia', 'language.english': 'English',
  'auth.email': 'Email', 'auth.password': 'Password', 'auth.showPassword': 'Show password', 'auth.hidePassword': 'Hide password', 'auth.processing': 'Processing…',
  'login.subtitle': 'Continue managing your finances', 'login.submit': 'Log in', 'login.forgot': 'Forgot password?', 'login.noAccount': "Don't have an account?", 'login.register': 'Register here', 'login.resend': "Didn't receive a verification email?", 'login.resending': 'Resending…', 'login.enterEmail': 'Enter your email first', 'login.verificationFailed': 'Failed to resend verification email', 'login.loading': 'Signing in…',
  'register.subtitle': 'Start tracking your finances and investments', 'register.name': 'Full name', 'register.namePlaceholder': 'Your full name', 'register.confirmPassword': 'Confirm password', 'register.submit': 'Register', 'register.hasAccount': 'Already have an account?', 'register.login': 'Log in here', 'register.passwordMismatch': 'Password confirmation does not match', 'register.loading': 'Creating your account…', 'register.agreement': 'By registering, you agree to the', 'register.terms': 'Terms of Use', 'register.privacy': 'Privacy Policy', 'register.andRead': 'and acknowledge the',
  'forgot.title': 'Forgot Password', 'forgot.subtitle': 'Enter your account email to receive a reset link.', 'forgot.send': 'Send Reset Link', 'forgot.sending': 'Sending…', 'forgot.loading': 'Sending reset link…', 'forgot.back': 'Back to login', 'forgot.failed': 'Password reset request failed', 'forgot.sent': 'If the email is registered, a password reset link has been sent. Please also check your spam folder.', 'forgot.dev': 'Development mode is active. Use the button below to change your password.', 'forgot.openReset': 'Open Reset Password Page',
  'reset.title': 'Create a New Password', 'reset.new': 'New Password', 'reset.confirm': 'Confirm Password', 'reset.save': 'Save New Password', 'reset.saving': 'Saving…', 'reset.loading': 'Saving your new password…', 'reset.invalid': 'This reset link is incomplete. Please request a new one.', 'reset.failed': 'Password reset failed',
  'verify.loading': 'Verifying email…', 'verify.invalid': 'The verification link is incomplete.', 'verify.failed': 'Email verification failed.', 'verify.successTitle': 'Email verified', 'verify.loadingTitle': 'Verify email', 'verify.errorTitle': 'Verification failed', 'verify.login': 'Go to login',
  'dashboard.title': 'Dashboard', 'dashboard.subtitle': 'View your cash flow, budgets, and investments in one summary.',
  'finance.title': 'Finance', 'finance.subtitle': 'Manage your income, expenses, and budgets',
  'portfolio.title': 'Portfolio', 'portfolio.subtitle': 'Track your holdings, performance, and investment income.',
  'chat.title': 'Mentor Chat', 'profile.title': 'Profile', 'about.title': 'About FinTrack',
  'chat.welcome': 'Hi! I am your FinTrack Financial Mentor. I can summarize your expenses, top categories, portfolio, and dividends using your account data. What would you like to review today?', 'chat.subtitle': 'Account-based summaries without sending data to an external AI service.', 'chat.private': 'Data stays in FinTrack', 'chat.daily': 'History resets daily', 'chat.today': "Today's conversation", 'chat.context': 'Context uses your latest account data', 'chat.ready': 'Ready', 'chat.loadingHistory': "Loading today's conversation…", 'chat.thinking': 'Mentor is summarizing your data…', 'chat.placeholder': 'Example: summarize my expenses this month', 'chat.inputLabel': 'Message for your mentor', 'chat.send': 'Send message', 'chat.hint': 'Enter to send · Shift + Enter for a new line', 'chat.historyFailed': "Failed to load today's conversation", 'chat.sendFailed': 'Message could not be sent. Please try again.',
  'settings.account': 'FinTrack Account', 'settings.subtitle': 'Manage your account identity and investment preferences.', 'settings.languageTitle': 'Language & region', 'settings.languageDescription': 'Choose the language used across FinTrack on this device.',
  'report.previewFinance': 'Financial Report Preview', 'report.previewPortfolio': 'Portfolio Report Preview', 'report.csv': 'CSV', 'report.pdf': 'Save PDF', 'report.monthly': 'Monthly', 'report.yearly': 'Yearly', 'report.all': 'All data', 'report.summary': 'Summary', 'report.detailed': 'Detailed',
};

const LanguageContext = createContext<{ language: Language; locale: string; setLanguage: (language: Language) => void; t: (key: string, variables?: Variables) => string; pick: (indonesian: string, english: string) => string } | null>(null);

const deviceLanguage = (): Language => navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [manual, setManual] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== null; } catch { return false; }
  });
  const [language, setCurrentLanguage] = useState<Language>(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); return saved === 'id' || saved === 'en' ? saved : deviceLanguage(); }
    catch { return deviceLanguage(); }
  });

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (manual) return;
    const followDevice = () => setCurrentLanguage(deviceLanguage());
    window.addEventListener('languagechange', followDevice);
    return () => window.removeEventListener('languagechange', followDevice);
  }, [manual]);

  const value = useMemo(() => ({
    language,
    locale: language === 'id' ? 'id-ID' : 'en-US',
    setLanguage: (next: Language) => {
      setCurrentLanguage(next); setManual(true);
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Continue without persistence. */ }
    },
    t: (key: string, variables: Variables = {}) => {
      const template = (language === 'en' ? en : id)[key];
      return (template || key).replace(/\{(\w+)\}/g, (_, name) => String(variables[name] ?? `{${name}}`));
    },
    pick: (indonesian: string, english: string) => language === 'en' ? english : indonesian,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
