import { useEffect, useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, Trash2, Download, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

type AutoPred = { category: string; confidence: number } | null;

export default function Expenses() {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    budgets,
    addBudget,
  } = useData();

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);

  // ✅ missing states (fix crash)
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoPred, setAutoPred] = useState<AutoPred>(null);

  // Form states
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: 'Makan',
    paymentMethod: 'Cash',
    merchant: '',
    notes: '',
  });

  const [budgetFormData, setBudgetFormData] = useState({
    category: 'Makan',
    amount: '',
    period: 'monthly' as 'monthly' | 'weekly',
  });

  const categories = ['Makan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'];
  const paymentMethods = ['Cash', 'Debit Card', 'Credit Card', 'E-Wallet', 'Transfer Bank'];

  // ✅ when editing, prefill form
  useEffect(() => {
    if (!editingExpense) return;
    const exp = expenses.find(e => e.id === editingExpense);
    if (!exp) return;

    setFormData({
      date: exp.date,
      amount: String(exp.amount),
      category: exp.category,
      paymentMethod: exp.paymentMethod,
      merchant: exp.merchant,
      notes: exp.notes || '',
    });
    setAutoPred(null);
  }, [editingExpense, expenses]);

  const handleAutoCategorize = async () => {
    try {
      setAutoLoading(true);
      const amount = formData.amount ? Number(formData.amount) : undefined;
      const text = [formData.merchant, formData.notes].filter(Boolean).join(' ').trim();

      if (!text) {
        toast.error('Isi merchant atau notes dulu agar bisa auto categorize');
        return;
      }

      const res = await api.predictCategory(text, amount);

      const predicted =
        res?.predicted_category ||
        res?.predictedCategory ||
        res?.category ||
        null;

      const conf = typeof res?.confidence === 'number' ? res.confidence : 0;

      if (predicted) {
        setFormData(prev => ({ ...prev, category: predicted }));
        setAutoPred({ category: predicted, confidence: conf });
        toast.success(`Prediksi: ${predicted} (${Math.round(conf * 100)}%)`);
      } else {
        toast.error('Model tidak mengembalikan kategori');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Gagal auto categorize');
    } finally {
      setAutoLoading(false);
    }
  };

  // Calculate monthly summary
  const monthlySummary = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyExpenses = expenses.filter(e => {
      const date = new Date(e.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const total = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

    const byCategory = new Map<string, number>();
    monthlyExpenses.forEach(e => {
      byCategory.set(e.category, (byCategory.get(e.category) || 0) + e.amount);
    });

    return {
      total,
      count: monthlyExpenses.length,
      byCategory: Array.from(byCategory.entries()).map(([category, amount]) => ({
        category,
        amount,
        budget: budgets.find(b => b.category === category)?.amount || 0,
      })),
    };
  }, [expenses, budgets]);

  const handleAddExpense = async () => {
    if (!formData.amount || !formData.merchant) {
      toast.error('Mohon lengkapi semua field!');
      return;
    }

    const amountNum = Number(formData.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('Jumlah harus > 0');
      return;
    }

    const predictedCategory = autoPred?.category;
    const confidence = autoPred?.confidence;

    try {
      await addExpense({
        date: formData.date,
        amount: amountNum,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        merchant: formData.merchant,
        notes: formData.notes,
        predictedCategory,
        confidence,
      });

      toast.success('Transaksi berhasil ditambahkan!');
      setShowAddExpense(false);
      setAutoPred(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: 'Makan',
        paymentMethod: 'Cash',
        merchant: '',
        notes: '',
      });
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menambahkan transaksi');
    }
  };

  const handleUpdateExpense = async (id: string) => {
    const amountNum = Number(formData.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('Jumlah harus > 0');
      return;
    }

    try {
      await updateExpense(id, {
        date: formData.date,
        amount: amountNum,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        merchant: formData.merchant,
        notes: formData.notes,
      });

      toast.success('Transaksi berhasil diupdate!');
      setEditingExpense(null);
      setAutoPred(null);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal update transaksi');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;
    try {
      await deleteExpense(id);
      toast.success('Transaksi berhasil dihapus!');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal hapus transaksi');
    }
  };

  const handleAddBudget = async () => {
    if (!budgetFormData.amount) {
      toast.error('Mohon masukkan jumlah budget!');
      return;
    }

    const amountNum = Number(budgetFormData.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('Budget harus > 0');
      return;
    }

    try {
      await addBudget({
        category: budgetFormData.category,
        amount: amountNum,
        period: budgetFormData.period,
      });

      toast.success('Budget berhasil ditambahkan!');
      setShowAddBudget(false);
      setBudgetFormData({
        category: 'Makan',
        amount: '',
        period: 'monthly',
      });
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menambahkan budget');
    }
  };

  const handleImportCSV = () => {
    toast.info('Fitur import CSV akan segera hadir!');
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Tanggal', 'Kategori', 'Merchant', 'Metode Bayar', 'Jumlah', 'Catatan'].join(','),
      ...expenses.map(e =>
        [e.date, e.category, e.merchant, e.paymentMethod, e.amount, e.notes].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
    toast.success('Data berhasil diekspor!');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengeluaran</h1>
          <p className="text-gray-600">Kelola transaksi & budget Anda</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleImportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => {
              setEditingExpense(null);
              setAutoPred(null);
              setShowAddExpense(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Ringkasan Bulan Ini</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Total Pengeluaran</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlySummary.total)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Jumlah Transaksi</p>
            <p className="text-2xl font-bold text-gray-900">{monthlySummary.count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Rata-rata per Transaksi</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(monthlySummary.count > 0 ? monthlySummary.total / monthlySummary.count : 0)}
            </p>
          </div>
        </div>

        {/* Category breakdown with budgets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">Per Kategori</h4>
            <button
              onClick={() => setShowAddBudget(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Atur Budget
            </button>
          </div>

          {monthlySummary.byCategory.map(({ category, amount, budget }) => {
            const percentage = budget > 0 ? (amount / budget) * 100 : 0;
            const isOverBudget = percentage > 100;

            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">{formatCurrency(amount)}</span>
                    {budget > 0 && (
                      <span className="text-xs text-gray-500">/ {formatCurrency(budget)}</span>
                    )}
                    {isOverBudget && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
                {budget > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      {(showAddExpense || editingExpense) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingExpense ? 'Edit Transaksi' : 'Tambah Transaksi'}
            </h3>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant</label>
                <input
                  type="text"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nama toko/tempat"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>

                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={handleAutoCategorize}
                    disabled={autoLoading}
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 text-sm text-gray-800 disabled:opacity-60"
                  >
                    {autoLoading ? 'Predicting…' : 'Auto Categorize'}
                  </button>
                  {autoPred && (
                    <span className="text-xs text-gray-600">
                      Confidence: {Math.round(autoPred.confidence * 100)}%
                    </span>
                  )}
                </div>

                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metode Bayar</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Catatan opsional"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddExpense(false);
                  setEditingExpense(null);
                  setAutoPred(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={editingExpense ? () => handleUpdateExpense(editingExpense) : handleAddExpense}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingExpense ? 'Update' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Budget Modal */}
      {showAddBudget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Atur Budget</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={budgetFormData.category}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Budget</label>
                <input
                  type="number"
                  value={budgetFormData.amount}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="2000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
                <select
                  value={budgetFormData.period}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, period: e.target.value as 'monthly' | 'weekly' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Bulanan</option>
                  <option value="weekly">Mingguan</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddBudget(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleAddBudget}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Riwayat Transaksi</h3>
          <div className="space-y-3">
            {expenses.slice().reverse().map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{expense.merchant}</p>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {expense.category}
                    </span>
                    {expense.predictedCategory && typeof expense.confidence === 'number' && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        AI: {(expense.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(expense.date).toLocaleDateString('id-ID')} • {expense.paymentMethod}
                  </p>
                  {expense.notes && <p className="text-sm text-gray-500 mt-1">{expense.notes}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <p className="font-semibold text-gray-900">{formatCurrency(expense.amount)}</p>

                  <button
                    onClick={() => {
                      setEditingExpense(expense.id);
                      setShowAddExpense(false);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    {/* icon kecil tanpa import Pencil biar simpel */}
                    ✎
                  </button>

                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {expenses.length === 0 && (
              <p className="text-center text-gray-500 py-8">Belum ada transaksi</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
