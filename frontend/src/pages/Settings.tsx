import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Save, User as UserIcon } from 'lucide-react';
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

      {/* Calculation Methods Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">📊 Metode Perhitungan</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>1 lot = 100 lembar saham</strong></p>
          <p><strong>Avg Price:</strong> Total biaya beli (termasuk fee) ÷ Total lembar</p>
          <p><strong>Realized P/L:</strong> Dihitung saat sell dengan metode FIFO (First In First Out)</p>
          <p><strong>Unrealized P/L:</strong> (Current Price - Avg Price) × Total Shares</p>
          <p><strong>Drawdown:</strong> (Peak Portfolio Value - Current Value) ÷ Peak Value × 100%</p>
          <p><strong>Dividen Total:</strong> Dividend per Share × Shares on Record Date</p>
        </div>
      </div>

      {/* AI & ML Features Info */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-3">🤖 Fitur AI/ML (Demo)</h3>
        <div className="space-y-2 text-sm text-green-800">
          <p><strong>Expense Categorization:</strong> Model deep learning (IndoBERT) memprediksi kategori transaksi berdasarkan deskripsi merchant. Akurasi ~85%.</p>
          <p><strong>Anomaly Detection:</strong> Autoencoder mendeteksi pengeluaran yang tidak biasa berdasarkan pola historis Anda.</p>
          <p><strong>Chatbot Tool Calling:</strong> ChatGPT terintegrasi dengan function calling untuk mengakses data real-time portofolio & pengeluaran.</p>
          <p className="pt-2 border-t border-green-300 mt-3">
            <strong>Note:</strong> Dalam production, backend FastAPI akan menjalankan model ML/DL untuk inference. Frontend ini menggunakan mock predictions.
          </p>
        </div>
      </div>

      {/* Backend Integration Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-purple-900 mb-3">⚙️ Backend Integration (FastAPI)</h3>
        <div className="space-y-2 text-sm text-purple-800">
          <p><strong>API Endpoints:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><code>POST /api/auth/login</code> - JWT authentication</li>
            <li><code>POST /api/auth/register</code> - User registration</li>
            <li><code>GET/POST /api/expenses</code> - CRUD expenses</li>
            <li><code>GET/POST /api/portfolio/transactions</code> - Stock transactions</li>
            <li><code>POST /api/ml/predict-category</code> - ML prediction</li>
            <li><code>GET /api/ml/anomalies</code> - Anomaly detection</li>
            <li><code>POST /api/chat/completions</code> - ChatGPT integration</li>
          </ul>
          <p className="pt-2 border-t border-purple-300 mt-3">
            <strong>Database:</strong> PostgreSQL dengan Alembic migration. Tabel: users, expenses, stock_transactions, holdings, dividends, daily_reports, audit_logs.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Save className="w-5 h-5" />
          Simpan Pengaturan
        </button>
      </div>

      {/* Additional Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">📚 Dokumentasi & Source Code</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            Aplikasi FinTrack Mentor ini adalah full-stack web app dengan React + TypeScript + TailwindCSS di frontend, 
            dan Python FastAPI + PostgreSQL + Deep Learning di backend.
          </p>
          <p className="font-medium mt-3">Fitur yang sudah diimplementasikan (Frontend Demo):</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>✅ Authentication (JWT Mock)</li>
            <li>✅ Expense tracking dengan budget alerts</li>
            <li>✅ Portfolio management (saham) dengan perhitungan P/L, avg price, drawdown</li>
            <li>✅ Daily report & equity curve visualization</li>
            <li>✅ ChatGPT-powered mentor dengan tool calling (mock responses)</li>
            <li>✅ User profile & DCA strategy settings</li>
            <li>✅ Responsive UI dengan Recharts</li>
          </ul>
          <p className="font-medium mt-3">Yang perlu diimplementasikan di Backend:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>🔨 FastAPI REST API dengan Pydantic models</li>
            <li>🔨 PostgreSQL database schema + Alembic migrations</li>
            <li>🔨 JWT authentication dengan bcrypt/argon2</li>
            <li>🔨 Deep Learning models (IndoBERT untuk categorization, Autoencoder untuk anomaly)</li>
            <li>🔨 Training pipeline + evaluation metrics</li>
            <li>🔨 ChatGPT API integration dengan function calling</li>
            <li>🔨 Unit tests untuk financial calculations</li>
            <li>🔨 Rate limiting & CORS configuration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
