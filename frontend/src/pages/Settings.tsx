import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, ChartNoAxesCombined, Download, KeyRound, LoaderCircle, PiggyBank, Plus, ReceiptText, Save, ShieldCheck, Trash2, UserRound, WalletCards } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/formatters';
import { api } from '../services/api';
import LanguageSelect from '../components/LanguageSelect';
import { useLanguage } from '../contexts/LanguageContext';

export default function Settings() {
  const { user, logout } = useAuth();
  const { userProfile, updateUserProfile, expenses, budgets, holdings, dividends, investmentAssets, customCategories, addCustomCategory, deleteCustomCategory } = useData();
  const [profile, setProfile] = useState(userProfile);
  const [focusStocksInput, setFocusStocksInput] = useState(userProfile.focusStocks.join(', '));
  const [saving, setSaving] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { t, pick } = useLanguage();

  useEffect(() => {
    setProfile(userProfile);
    setFocusStocksInput(userProfile.focusStocks.join(', '));
  }, [userProfile]);

  const accountStats = useMemo(() => [
    { label: pick('Transaksi keuangan', 'Financial transactions'), value: expenses.length, icon: ReceiptText, color: 'text-blue-600 bg-blue-50' },
    { label: pick('Budget tersimpan', 'Saved budgets'), value: budgets.length, icon: PiggyBank, color: 'text-green-700 bg-green-50' },
    { label: pick('Aset investasi aktif', 'Active investment assets'), value: holdings.length + investmentAssets.filter((asset) => asset.market_value > 0).length, icon: ChartNoAxesCombined, color: 'text-purple-600 bg-purple-50' },
    { label: pick('Catatan dividen', 'Dividend records'), value: dividends.length, icon: WalletCards, color: 'text-yellow-700 bg-yellow-50' },
  ], [budgets.length, dividends.length, expenses.length, holdings.length, investmentAssets, pick]);

  const handleSave = async () => {
    const focusStocks = focusStocksInput.split(',').map((stock) => stock.trim().toUpperCase()).filter(Boolean);
    setSaving(true);
    try {
      await updateUserProfile({ ...profile, baseCurrency: 'IDR', focusStocks, onboardingCompleted: true });
      toast.success(pick('Preferensi profil berhasil disimpan', 'Profile preferences saved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : pick('Preferensi gagal disimpan', 'Failed to save preferences'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) return toast.error(pick('Nama kategori wajib diisi', 'Category name is required'));
    try {
      await addCustomCategory(categoryType, categoryName.trim());
      setCategoryName('');
      toast.success(pick('Kategori personal ditambahkan', 'Custom category added'));
    } catch (error) { toast.error(error instanceof Error ? error.message : pick('Kategori gagal ditambahkan', 'Failed to add category')); }
  };

  const handleExportAccount = async () => {
    try {
      const data = await api.exportAccountData();
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `fintrack-data-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
      URL.revokeObjectURL(url);
      toast.success(pick('Data akun berhasil diekspor', 'Account data exported'));
    } catch (error) { toast.error(error instanceof Error ? error.message : pick('Data gagal diekspor', 'Failed to export account data')); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword || !window.confirm(pick('Hapus akun dan seluruh data secara permanen? Tindakan ini tidak dapat dibatalkan.', 'Permanently delete your account and all data? This action cannot be undone.'))) return;
    setDeletingAccount(true);
    try {
      await api.deleteAccount(deletePassword);
      logout();
    } catch (error) { toast.error(error instanceof Error ? error.message : pick('Akun gagal dihapus', 'Failed to delete account')); }
    finally { setDeletingAccount(false); }
  };

  const frequencyLabel = profile.dcaFrequency === 'weekly'
    ? pick('minggu', 'week') : profile.dcaFrequency === 'biweekly' ? pick('dua minggu', 'two weeks') : pick('bulan', 'month');

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600 mb-1">{t('settings.account')}</p>
        <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
        <p className="text-gray-600 mt-1">{t('settings.subtitle')}</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold text-gray-900">{t('settings.languageTitle')}</h2><p className="mt-1 text-sm text-gray-500">{t('settings.languageDescription')} {t('language.auto')}</p></div>
          <LanguageSelect />
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 shrink-0 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900 break-words">{user?.name || pick('Pengguna FinTrack', 'FinTrack User')}</h2>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" /> {pick('Dilindungi login', 'Login protected')}
              </span>
            </div>
            <p className="text-sm text-gray-600 break-all mt-1">{user?.email}</p>
            <p className="text-xs text-gray-500 mt-2">{pick('ID akun', 'Account ID')}: {user?.id || '-'}</p>
          </div>
          <Link to="/forgot-password" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <KeyRound className="w-4 h-4" /> {pick('Ganti password', 'Change password')}
          </Link>
        </div>
      </section>

      {!userProfile.onboardingCompleted && <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5"><p className="font-semibold text-blue-900">{pick('Lengkapi pengaturan awal Anda', 'Complete your initial setup')}</p><p className="text-sm text-blue-700 mt-1">{pick('Pilih mata uang, zona waktu, dan preferensi investasi. Tekan Simpan preferensi setelah selesai.', 'Choose your currency, time zone, and investment preferences, then save your preferences.')}</p></section>}

      <section>
        <h2 className="text-base font-semibold text-gray-900">{pick('Ringkasan akun', 'Account Summary')}</h2>
        <p className="text-sm text-gray-500 mb-3">{pick('Data yang tercatat pada akun Anda saat ini.', 'Data currently recorded in your account.')}</p>
        <div className="grid grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_18rem] gap-3 xl:gap-6">
          {accountStats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm min-w-0">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
              <p className="text-2xl font-semibold text-gray-900 mt-3 tabular-nums">{value}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem] gap-6 items-start">
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 min-w-0">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><ChartNoAxesCombined className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{pick('Preferensi investasi', 'Investment Preferences')}</h2>
              <p className="text-sm text-gray-500">{pick('Digunakan Chat Mentor sebagai konteks analisis.', 'Used by Mentor Chat as analysis context.')}</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{pick('Mata uang laporan', 'Report currency')}</label><div className="w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-700 rounded-lg">IDR — Rupiah</div><p className="text-xs text-gray-500 mt-1.5">{pick('Aset asing dikonversi ke IDR menggunakan kurs yang Anda masukkan.', 'Foreign assets are converted to IDR using the exchange rate you enter.')}</p></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{pick('Zona waktu', 'Time zone')}</label><select value={profile.timezone} onChange={(event) => setProfile({ ...profile, timezone: event.target.value as typeof profile.timezone })} className="w-full min-w-0 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"><option value="Asia/Jakarta">WIB — Jakarta</option><option value="Asia/Makassar">WITA — Makassar</option><option value="Asia/Jayapura">WIT — Jayapura</option></select></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{pick('Deskripsi strategi', 'Strategy description')}</label>
              <textarea value={profile.dcaStrategy} onChange={(event) => setProfile({ ...profile, dcaStrategy: event.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={3} placeholder="Contoh: Investasi rutin ke instrumen pilihan..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target DCA</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 text-sm">Rp</span>
                  <input type="number" min="0" value={profile.dcaAmount} onChange={(event) => setProfile({ ...profile, dcaAmount: Number(event.target.value) || 0 })} className="w-full min-w-0 pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">{formatCurrency(profile.dcaAmount)} per {frequencyLabel}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{pick('Frekuensi', 'Frequency')}</label>
                <select value={profile.dcaFrequency} onChange={(event) => setProfile({ ...profile, dcaFrequency: event.target.value as 'weekly' | 'biweekly' | 'monthly' })} className="w-full min-w-0 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="weekly">{pick('Mingguan', 'Weekly')}</option><option value="biweekly">{pick('Dua minggu sekali', 'Every two weeks')}</option><option value="monthly">{pick('Bulanan', 'Monthly')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{pick('Saham fokus', 'Focus stocks')}</label>
              <input type="text" value={focusStocksInput} onChange={(event) => setFocusStocksInput(event.target.value)} className="w-full min-w-0 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="BBCA, BBRI, TLKM" />
              <p className="text-xs text-gray-500 mt-1.5">{pick('Pisahkan setiap ticker dengan koma.', 'Separate each ticker with a comma.')}</p>
            </div>

            <label className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
              <input type="checkbox" checked={profile.compoundingDividends} onChange={(event) => setProfile({ ...profile, compoundingDividends: event.target.checked })} className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 shrink-0" />
              <span><span className="block text-sm font-medium text-gray-900">{pick('Reinvest dividen untuk compounding', 'Reinvest dividends for compounding')}</span><span className="block text-xs text-gray-500 mt-1">{pick('Menandai bahwa dividen masuk ke rencana investasi berikutnya.', 'Marks dividends for your next investment plan.')}</span></span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Catatan strategi</label>
              <textarea value={profile.bonusWeekRule} onChange={(event) => setProfile({ ...profile, bonusWeekRule: event.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={2} placeholder="Contoh: Tambah alokasi DCA saat menerima bonus..." />
            </div>

            <div className="settings-save-action flex justify-end pt-1">
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-60">{saving ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {saving ? pick('Menyimpan…', 'Saving…') : pick('Simpan preferensi', 'Save preferences')}</button>
            </div>
          </div>
        </section>

        <aside className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 min-w-0">
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-5 h-5 text-green-700" /><h2 className="font-semibold text-gray-900">{pick('Keamanan & data', 'Security & Data')}</h2></div>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2"><BadgeCheck className="w-4 h-4 text-green-700 mt-0.5 shrink-0" /><span>{pick('Halaman akun dilindungi login.', 'Account pages are protected by login.')}</span></div>
              <div className="flex items-start gap-2"><UserRound className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" /><span>{pick('Data keuangan dipisahkan berdasarkan pemilik akun.', 'Financial data is separated by account owner.')}</span></div>
            </div>
            <p className="text-xs text-gray-500 border-t border-gray-200 mt-4 pt-4">Preferensi investasi tersimpan pada akun dan tersedia di perangkat lain setelah login.</p>
            <button type="button" onClick={() => void handleExportAccount()} className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"><Download className="w-4 h-4" /> {pick('Export data akun', 'Export account data')}</button>
            <p className="mt-2 text-xs text-gray-500">File JSON mencakup data akun dan chat. Foto struk dapat diunduh dari transaksi terkait.</p>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900">{pick('Akses cepat', 'Quick Access')}</h2>
            <p className="text-xs text-gray-500 mb-3">Lanjutkan pengelolaan akun Anda.</p>
            <div className="divide-y divide-gray-100">
              {([['/expenses', pick('Kelola keuangan', 'Manage finances')], ['/portfolio', pick('Lihat portofolio', 'View portfolio')], ['/chat', pick('Buka Chat Mentor', 'Open Mentor Chat')], ['/about', pick('Tentang FinTrack', 'About FinTrack')]] as const).map(([href, label]) => (
                <Link key={href} to={href} className="flex items-center justify-between gap-3 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">{label}<ArrowRight className="w-4 h-4 shrink-0" /></Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="mb-4"><h2 className="text-lg font-semibold text-gray-900">{pick('Kategori personal', 'Custom Categories')}</h2><p className="text-sm text-gray-500">{pick('Tambahkan kategori yang sesuai dengan kebiasaan keuangan Anda.', 'Add categories that match your financial habits.')}</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-[10rem_minmax(0,1fr)_auto] gap-2">
          <select value={categoryType} onChange={(event) => setCategoryType(event.target.value as typeof categoryType)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"><option value="expense">{pick('Pengeluaran', 'Expense')}</option><option value="income">{pick('Pemasukan', 'Income')}</option></select>
          <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleAddCategory(); }} className="w-full min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg" placeholder="Contoh: Peliharaan" />
          <button type="button" onClick={() => void handleAddCategory()} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg"><Plus className="w-4 h-4" /> {pick('Tambah', 'Add')}</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">{customCategories.map((category) => <span key={category.id} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full">{category.name}<span className="text-xs text-gray-400">{category.transactionType === 'income' ? 'Masuk' : 'Keluar'}</span><button type="button" aria-label={`Hapus kategori ${category.name}`} onClick={() => void deleteCustomCategory(category.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button></span>)}</div>
        {customCategories.length === 0 && <p className="text-sm text-gray-500 mt-4">{pick('Belum ada kategori personal.', 'No custom categories yet.')}</p>}
      </section>

      <section className="rounded-xl border border-red-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-red-700">{pick('Hapus akun', 'Delete Account')}</h2><p className="text-sm text-gray-500 mt-1">{pick('Seluruh transaksi, budget, portofolio, chat, preferensi, dan struk akan dihapus permanen.', 'All transactions, budgets, portfolio data, chats, preferences, and receipts will be permanently deleted.')}</p>
        <div className="flex flex-col sm:flex-row gap-2 mt-4"><input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className="flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg" placeholder={pick('Masukkan password untuk konfirmasi', 'Enter your password to confirm')} /><button type="button" disabled={deletingAccount || !deletePassword} onClick={() => void handleDeleteAccount()} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg disabled:opacity-50">{deletingAccount && <LoaderCircle className="w-4 h-4 animate-spin" />} {pick('Hapus akun', 'Delete account')}</button></div>
        <p className="text-xs text-gray-500 mt-3"><Link to="/privacy" className="text-blue-600">Kebijakan Privasi</Link> · <Link to="/terms" className="text-blue-600">Ketentuan Penggunaan</Link></p>
      </section>
    </div>
  );
}
