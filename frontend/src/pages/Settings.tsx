import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { user } = useAuth();
  const { userProfile, updateUserProfile } = useData();

  const [profile, setProfile] = useState(userProfile);
  const [focusStocksInput, setFocusStocksInput] = useState(userProfile.focusStocks.join(', '));

  const handleSave = () => {
    const focusStocks = focusStocksInput
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);

    updateUserProfile({
      ...profile,
      focusStocks
    });

    toast.success('Pengaturan berhasil disimpan!');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-600">Kelola profil & preferensi investasi Anda</p>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{user?.name}</h3>
            <p className="text-gray-600">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* DCA Strategy Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategi DCA & Investasi</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi Strategi
            </label>
            <textarea
              value={profile.dcaStrategy}
              onChange={(e) => setProfile({ ...profile, dcaStrategy: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Contoh: Investasi rutin setiap minggu ke saham bluechip..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah DCA
              </label>
              <input
                type="number"
                value={profile.dcaAmount}
                onChange={(e) => setProfile({ ...profile, dcaAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="500000"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(profile.dcaAmount)}/{profile.dcaFrequency === 'weekly' ? 'minggu' : 'bulan'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frekuensi
              </label>
              <select
                value={profile.dcaFrequency}
                onChange={(e) => setProfile({ ...profile, dcaFrequency: e.target.value as 'weekly' | 'biweekly' | 'monthly' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="weekly">Mingguan</option>
                <option value="biweekly">Dua Minggu Sekali</option>
                <option value="monthly">Bulanan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Saham Fokus (pisahkan dengan koma)
            </label>
            <input
              type="text"
              value={focusStocksInput}
              onChange={(e) => setFocusStocksInput(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="BBCA, BBRI, TLKM"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ticker saham yang menjadi fokus investasi Anda
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={profile.compoundingDividends}
                onChange={(e) => setProfile({ ...profile, compoundingDividends: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Reinvest dividen untuk compounding
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-6 mt-1">
              Dividen yang diterima akan digunakan untuk membeli saham tambahan
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan Khusus (Bonus Week Rule)
            </label>
            <textarea
              value={profile.bonusWeekRule}
              onChange={(e) => setProfile({ ...profile, bonusWeekRule: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Contoh: Kadang skip minggu karena pengeluaran tak terduga..."
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-save-action flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Save className="w-5 h-5" />
          Simpan Pengaturan
        </button>
      </div>

    </div>
  );
}
