import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DailyReport() {
  const { dailyReports, addDailyReport, holdings } = useData();
  const [showAddReport, setShowAddReport] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    portfolioValue: '',
    notes: ''
  });

  const handleAddReport = () => {
    if (!formData.portfolioValue) {
      toast.error('Mohon masukkan nilai portofolio!');
      return;
    }

    addDailyReport({
      ...formData,
      portfolioValue: parseFloat(formData.portfolioValue)
    });

    toast.success('Daily report berhasil ditambahkan!');
    setShowAddReport(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      portfolioValue: '',
      notes: ''
    });
  };

  // Calculate change from previous day
  const getChange = (currentValue: number, index: number) => {
    if (index < dailyReports.length - 1) {
      const prevValue = dailyReports[index + 1].portfolioValue;
      const change = currentValue - prevValue;
      const changePercent = (change / prevValue) * 100;
      return { change, changePercent };
    }
    return { change: 0, changePercent: 0 };
  };

  // Prepare chart data
  const chartData = dailyReports
    .slice()
    .reverse()
    .slice(-30)
    .map(report => ({
      date: new Date(report.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      value: report.portfolioValue
    }));

  // Calculate statistics
  const stats = {
    currentValue: dailyReports[0]?.portfolioValue || 0,
    highestValue: Math.max(...dailyReports.map(r => r.portfolioValue)),
    lowestValue: Math.min(...dailyReports.map(r => r.portfolioValue)),
    avgValue: dailyReports.reduce((sum, r) => sum + r.portfolioValue, 0) / (dailyReports.length || 1)
  };

  const drawdown = stats.highestValue > 0 
    ? ((stats.highestValue - stats.currentValue) / stats.highestValue) * 100 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Report</h1>
          <p className="text-gray-600">Catat nilai portofolio harian Anda</p>
        </div>
        <button
          onClick={() => {
            // Auto-fill with current portfolio value
            const currentValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
            setFormData({
              ...formData,
              portfolioValue: currentValue.toString()
            });
            setShowAddReport(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Report
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Nilai Terkini</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.currentValue)}</p>
          <p className="text-xs text-gray-500 mt-1">{dailyReports.length} hari tercatat</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Peak Value</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.highestValue)}</p>
          <p className="text-xs text-gray-500 mt-1">All-time high</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <p className="text-sm text-gray-600">Drawdown</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{drawdown.toFixed(2)}%</p>
          <p className="text-xs text-gray-500 mt-1">Dari peak</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Rata-rata</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avgValue)}</p>
          <p className="text-xs text-gray-500 mt-1">30 hari terakhir</p>
        </div>
      </div>

      {/* Equity Curve Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Equity Curve (30 Hari Terakhir)</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[350px] text-gray-500">
            Belum ada data daily report
          </div>
        )}
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Riwayat Report</h3>
          <div className="space-y-3">
            {dailyReports.map((report, index) => {
              const { change, changePercent } = getChange(report.portfolioValue, index);
              
              return (
                <div key={report.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(report.date).toLocaleDateString('id-ID', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(report.portfolioValue)}
                      </p>
                    </div>
                    {index < dailyReports.length - 1 && (
                      <div className={`flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {change >= 0 ? '+' : ''}{formatCurrency(change)}
                          </p>
                          <p className="text-xs">
                            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {report.notes && (
                    <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                      <p className="text-sm text-gray-700">{report.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
            {dailyReports.length === 0 && (
              <p className="text-center text-gray-500 py-8">Belum ada daily report</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Report Modal */}
      {showAddReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Tambah Daily Report</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Portofolio</label>
                <input
                  type="number"
                  value={formData.portfolioValue}
                  onChange={(e) => setFormData({ ...formData, portfolioValue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="1500000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nilai portfolio saat ini: {formatCurrency(holdings.reduce((sum, h) => sum + h.marketValue, 0))}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Catatan tentang kondisi market, strategi, atau refleksi hari ini..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddReport(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleAddReport}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
