import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, ChartNoAxesCombined, KeyRound, PiggyBank, ReceiptText, Save, ShieldCheck, UserRound, WalletCards } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function Settings() {
  const { user } = useAuth();
  const { userProfile, updateUserProfile, expenses, budgets, holdings, dividends } = useData();
  const [profile, setProfile] = useState(userProfile);
  const [focusStocksInput, setFocusStocksInput] = useState(userProfile.focusStocks.join(', '));

  useEffect(() => {
    setProfile(userProfile);
    setFocusStocksInput(userProfile.focusStocks.join(', '));
  }, [userProfile]);

  const accountStats = useMemo(() => [
    { label: 'Transaksi keuangan', value: expenses.length, icon: ReceiptText, color: 'text-blue-600 bg-blue-50' },
    { label: 'Budget tersimpan', value: budgets.length, icon: PiggyBank, color: 'text-green-700 bg-green-50' },
    { label: 'Saham aktif', value: holdings.length, icon: ChartNoAxesCombined, color: 'text-purple-600 bg-purple-50' },
    { label: 'Catatan dividen', value: dividends.length, icon: WalletCards, color: 'text-yellow-700 bg-yellow-50' },
  ], [budgets.length, dividends.length, expenses.length, holdings.length]);

  const handleSave = () => {
    const focusStocks = focusStocksInput.split(',').map((stock) => stock.trim().toUpperCase()).filter(Boolean);
    updateUserProfile({ ...profile, focusStocks });
    toast.success('Preferensi profil berhasil disimpan');
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(value);

  const frequencyLabel = profile.dcaFrequency === 'weekly'
    ? 'minggu' : profile.dcaFrequency === 'biweekly' ? 'dua minggu' : 'bulan';

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600 mb-1">Akun FinTrack</p>
        <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
        <p className="text-gray-600 mt-1">Kelola identitas akun dan preferensi investasi Anda.</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 shrink-0 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900 break-words">{user?.name || 'Pengguna FinTrack'}</h2>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                <BadgeCheck className="w-3.5 h-3.5" /> Aktif
              </span>
            </div>
            <p className="text-sm text-gray-600 break-all mt-1">{user?.email}</p>
            <p className="text-xs text-gray-500 mt-2">ID akun: {user?.id || '-'}</p>
          </div>
          <Link to="/forgot-password" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <KeyRound className="w-4 h-4" /> Ganti password
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900">Ringkasan akun</h2>
        <p className="text-sm text-gray-500 mb-3">Data yang tercatat pada akun Anda saat ini.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {accountStats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm min-w-0">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
              <p className="text-2xl font-semibold text-gray-900 mt-3 tabular-nums">{value}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 min-w-0">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><ChartNoAxesCombined className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Preferensi investasi</h2>
              <p className="text-sm text-gray-500">Digunakan Chat Mentor sebagai konteks analisis.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi strategi</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Frekuensi</label>
                <select value={profile.dcaFrequency} onChange={(event) => setProfile({ ...profile, dcaFrequency: event.target.value as 'weekly' | 'biweekly' | 'monthly' })} className="w-full min-w-0 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="weekly">Mingguan</option><option value="biweekly">Dua minggu sekali</option><option value="monthly">Bulanan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Saham fokus</label>
              <input type="text" value={focusStocksInput} onChange={(event) => setFocusStocksInput(event.target.value)} className="w-full min-w-0 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="BBCA, BBRI, TLKM" />
              <p className="text-xs text-gray-500 mt-1.5">Pisahkan setiap ticker dengan koma.</p>
            </div>

            <label className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
              <input type="checkbox" checked={profile.compoundingDividends} onChange={(event) => setProfile({ ...profile, compoundingDividends: event.target.checked })} className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 shrink-0" />
              <span><span className="block text-sm font-medium text-gray-900">Reinvest dividen untuk compounding</span><span className="block text-xs text-gray-500 mt-1">Menandai bahwa dividen masuk ke rencana investasi berikutnya.</span></span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Catatan strategi</label>
              <textarea value={profile.bonusWeekRule} onChange={(event) => setProfile({ ...profile, bonusWeekRule: event.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={2} placeholder="Contoh: Tambah alokasi DCA saat menerima bonus..." />
            </div>

            <div className="settings-save-action flex justify-end pt-1">
              <button onClick={handleSave} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"><Save className="w-5 h-5" /> Simpan preferensi</button>
            </div>
          </div>
        </section>

        <aside className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 xl:grid-rows-2 gap-6 min-w-0">
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 h-full">
            <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-5 h-5 text-green-700" /><h2 className="font-semibold text-gray-900">Keamanan & data</h2></div>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2"><BadgeCheck className="w-4 h-4 text-green-700 mt-0.5 shrink-0" /><span>Halaman akun dilindungi login.</span></div>
              <div className="flex items-start gap-2"><UserRound className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" /><span>Data keuangan dipisahkan berdasarkan pemilik akun.</span></div>
            </div>
            <p className="text-xs text-gray-500 border-t border-gray-200 mt-4 pt-4">Preferensi investasi di halaman ini disimpan pada browser yang sedang digunakan.</p>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 h-full">
            <h2 className="font-semibold text-gray-900">Akses cepat</h2>
            <p className="text-xs text-gray-500 mb-3">Lanjutkan pengelolaan akun Anda.</p>
            <div className="divide-y divide-gray-100">
              {([['/expenses', 'Kelola keuangan'], ['/portfolio', 'Lihat portofolio'], ['/chat', 'Buka Chat Mentor'], ['/about', 'Tentang FinTrack']] as const).map(([href, label]) => (
                <Link key={href} to={href} className="flex items-center justify-between gap-3 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">{label}<ArrowRight className="w-4 h-4 shrink-0" /></Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
