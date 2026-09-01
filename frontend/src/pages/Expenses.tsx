import { useEffect, useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, Trash2, Download, Upload, AlertTriangle, Camera, Search, X, WalletCards } from 'lucide-react';
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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptScanning, setReceiptScanning] = useState(false);
  const [receiptScanText, setReceiptScanText] = useState('');
  const [entryMode, setEntryMode] = useState<'scan' | 'manual'>('scan');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [historyType, setHistoryType] = useState<'all' | 'income' | 'expense'>('all');
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    const modalOpen = showAddExpense || Boolean(editingExpense) || showAddBudget || Boolean(selectedReceipt);
    if (!modalOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showAddExpense, editingExpense, showAddBudget, selectedReceipt]);

  // Form states
  const [formData, setFormData] = useState({
    transactionType: 'expense' as 'income' | 'expense',
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

  const expenseCategories = ['Makan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'];
  const incomeCategories = ['Gaji', 'Bonus', 'Usaha', 'Investasi', 'Hadiah', 'Lainnya'];
  const categories = formData.transactionType === 'income' ? incomeCategories : expenseCategories;
  const paymentMethods = ['Cash', 'Debit Card', 'Credit Card', 'E-Wallet', 'Transfer Bank'];

  // ✅ when editing, prefill form
  useEffect(() => {
    if (!editingExpense) return;
    const exp = expenses.find(e => e.id === editingExpense);
    if (!exp) return;

    setFormData({
      transactionType: exp.transactionType,
      date: exp.date,
      amount: String(exp.amount),
      category: exp.category,
      paymentMethod: exp.paymentMethod,
      merchant: exp.merchant,
      notes: exp.notes || '',
    });
    setAutoPred(null);
  }, [editingExpense, expenses]);

  useEffect(() => () => {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    if (selectedReceipt) URL.revokeObjectURL(selectedReceipt);
  }, [receiptPreview, selectedReceipt]);

  const filteredTransactions = useMemo(() => {
    const search = historySearch.trim().toLowerCase();
    return expenses.filter((transaction) => {
      const matchesType = historyType === 'all' || transaction.transactionType === historyType;
      const matchesSearch = !search || [transaction.merchant, transaction.category, transaction.notes]
        .some((value) => value?.toLowerCase().includes(search));
      return matchesType && matchesSearch;
    });
  }, [expenses, historySearch, historyType]);

  const handleReceiptChange = async (files: File[]) => {
    if (files.length > 4) {
      toast.error('Maksimal 4 foto untuk satu struk');
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      toast.error('Ukuran setiap foto struk maksimal 5 MB');
      return;
    }
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      toast.error('Foto struk harus berformat JPG, PNG, atau WebP');
      return;
    }
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFiles(files);
    setReceiptFile(files[0] || null);
    setReceiptPreview(files[0] ? URL.createObjectURL(files[0]) : null);
    setReceiptScanText('');

    if (files.length === 0) return;
    setReceiptScanning(true);
    try {
      const result = await api.scanReceipt(files);
      setFormData((current) => ({
        ...current,
        transactionType: 'expense',
        date: result.date || current.date,
        amount: result.amount != null ? String(result.amount) : current.amount,
        category: result.category || current.category,
        paymentMethod: result.payment_method || current.paymentMethod,
        merchant: result.merchant || current.merchant,
        notes: result.notes || current.notes,
      }));
      setReceiptScanText(result.raw_text || 'Struk berhasil dibaca. Silakan periksa kembali hasilnya.');
      toast.success('Struk berhasil dibaca dan form sudah diisi otomatis');
    } catch (error: any) {
      toast.error(error?.message || 'Foto struk gagal dibaca');
    } finally {
      setReceiptScanning(false);
    }
  };

  const handleViewReceipt = async (id: string) => {
    try {
      const blob = await api.getReceiptBlob(Number(id));
      if (selectedReceipt) URL.revokeObjectURL(selectedReceipt);
      setSelectedReceipt(URL.createObjectURL(blob));
    } catch (error: any) {
      toast.error(error?.message || 'Foto struk tidak dapat dimuat');
    }
  };

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

  // Ringkasan utama memakai seluruh riwayat. Budget tetap dibandingkan dengan bulan berjalan.
  const monthlySummary = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = expenses.filter(e => {
      const date = new Date(e.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const monthlyExpenses = monthlyTransactions.filter(e => e.transactionType !== 'income');
    const allExpenses = expenses.filter(e => e.transactionType !== 'income');
    const allIncome = expenses.filter(e => e.transactionType === 'income');
    const totalExpense = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = allIncome.reduce((sum, e) => sum + e.amount, 0);

    const byCategory = new Map<string, number>();
    allExpenses.forEach(e => {
      byCategory.set(e.category, (byCategory.get(e.category) || 0) + e.amount);
    });
    const monthlyByCategory = new Map<string, number>();
    monthlyExpenses.forEach(e => {
      monthlyByCategory.set(e.category, (monthlyByCategory.get(e.category) || 0) + e.amount);
    });

    return {
      totalExpense,
      totalIncome,
      balance: totalIncome - totalExpense,
      count: expenses.length,
      byCategory: Array.from(byCategory.entries()).map(([category, amount]) => ({
        category,
        amount,
        budget: budgets.find(b => b.category === category)?.amount || 0,
        budgetSpent: monthlyByCategory.get(category) || 0,
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
        transactionType: formData.transactionType,
        date: formData.date,
        amount: amountNum,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        merchant: formData.merchant,
        notes: formData.notes,
        predictedCategory,
        confidence,
        receiptFile: receiptFile || undefined,
      });

      toast.success('Transaksi berhasil ditambahkan!');
      setShowAddExpense(false);
      setAutoPred(null);
      setEntryMode('scan');
      void handleReceiptChange([]);
      setFormData({
        transactionType: 'expense',
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
        transactionType: formData.transactionType,
        date: formData.date,
        amount: amountNum,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        merchant: formData.merchant,
        notes: formData.notes,
        receiptFile: receiptFile || undefined,
      });

      toast.success('Transaksi berhasil diupdate!');
      setEditingExpense(null);
      setAutoPred(null);
      void handleReceiptChange([]);
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
      ['Tanggal', 'Jenis', 'Kategori', 'Sumber/Merchant', 'Metode', 'Jumlah', 'Catatan'].join(','),
      ...expenses.map(e =>
        [e.date, e.transactionType, e.category, e.merchant, e.paymentMethod, e.amount, e.notes].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financial-transactions.csv';
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
      <div className="finance-page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keuangan</h1>
          <p className="text-gray-600">Kelola pemasukan, pengeluaran, dan budget Anda</p>
        </div>
        <div className="finance-header-actions">
          <button
            onClick={handleImportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => {
              setEditingExpense(null);
              setAutoPred(null);
              setEntryMode('scan');
              void handleReceiptChange([]);
              setShowAddExpense(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Transaksi
          </button>
        </div>
      </div>

      {/* Monthly Summary */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">Ringkasan Keseluruhan</h3>
            <p className="text-sm text-gray-500">Akumulasi seluruh transaksi Anda</p>
          </div>
        </div>

        <div className="finance-overview-grid">
          <div className="finance-balance-card">
            <div className="finance-balance-decoration finance-balance-decoration-one" />
            <div className="finance-balance-decoration finance-balance-decoration-two" />
            <div className="finance-balance-content">
              <div className="finance-balance-heading">
                <div className="finance-balance-icon"><WalletCards className="w-5 h-5" /></div>
                <div>
                  <p className="finance-balance-label">Saldo keseluruhan</p>
                  <p className="finance-balance-period">Pemasukan dikurangi pengeluaran</p>
                </div>
              </div>
              <p className="finance-balance-value">{formatCurrency(monthlySummary.balance)}</p>
              <div className="finance-balance-footer">
                <span className={`finance-cashflow-badge ${monthlySummary.balance >= 0 ? 'finance-cashflow-positive' : 'finance-cashflow-negative'}`}>
                  {monthlySummary.balance >= 0 ? 'Arus kas positif' : 'Arus kas negatif'}
                </span>
                <span className="finance-transaction-count">{monthlySummary.count} transaksi</span>
              </div>
            </div>
          </div>
          <div className="finance-flow-grid">
            <div className="finance-flow-card finance-income-card">
              <p className="text-sm text-gray-600">Pemasukan</p>
              <p className="text-xl font-bold text-green-600">+{formatCurrency(monthlySummary.totalIncome)}</p>
            </div>
            <div className="finance-flow-card finance-expense-card">
              <p className="text-sm text-gray-600">Pengeluaran</p>
              <p className="text-xl font-bold text-red-600">-{formatCurrency(monthlySummary.totalExpense)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category breakdown with budgets */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
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

          {monthlySummary.byCategory.map(({ category, amount, budget, budgetSpent }) => {
            const percentage = budget > 0 ? (budgetSpent / budget) * 100 : 0;
            const isOverBudget = percentage > 100;

            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{category}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(amount)}</span>
                    {budget > 0 && (
                      <p className="text-xs text-gray-500">Bulan ini: {formatCurrency(budgetSpent)} / {formatCurrency(budget)}</p>
                    )}
                    {isOverBudget && <AlertTriangle className="inline-block w-4 h-4 text-red-500 mt-1" />}
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
          {monthlySummary.byCategory.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">Belum ada data pengeluaran.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      {(showAddExpense || editingExpense) && (
        <div className="finance-transaction-overlay fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }}>
          <div className="finance-transaction-dialog bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 sm:px-6 sm:pt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingExpense ? 'Edit Transaksi' : 'Tambah Transaksi'}
            </h3>

            <div className="space-y-4">
              {!editingExpense && (
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                  <button type="button" onClick={() => setEntryMode('scan')} className={`px-3 py-2 rounded-lg text-sm font-medium ${entryMode === 'scan' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>
                    Scan Struk
                  </button>
                  <button type="button" onClick={() => setEntryMode('manual')} className={`px-3 py-2 rounded-lg text-sm font-medium ${entryMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>
                    Input Manual
                  </button>
                </div>
              )}

              {!editingExpense && entryMode === 'scan' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <label className="block text-sm font-semibold text-blue-900 mb-1">Scan Struk Otomatis</label>
                  <p className="text-xs text-blue-700 mb-3">Upload satu foto—tanggal, total, merchant, pembayaran, kategori, dan catatan akan terisi otomatis.</p>
                  <label className="flex items-center justify-center gap-3 w-full min-h-24 px-4 py-3 bg-white border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                    {receiptPreview ? (
                      <div className="text-center">
                        <img src={receiptPreview} alt="Preview struk" className="h-20 max-w-32 object-cover rounded-lg" />
                        <p className="text-xs text-blue-700 mt-1">{receiptFiles.length} foto dipilih</p>
                      </div>
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">Pilih beberapa foto struk</p>
                          <p className="text-xs text-gray-500">Foto penuh + close-up lipatan · maksimal 4 foto</p>
                        </div>
                      </>
                    )}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => void handleReceiptChange(Array.from(event.target.files || []))} />
                  </label>
                  {receiptScanning && <p className="mt-3 text-sm font-medium text-blue-700">Membaca seluruh informasi pada struk…</p>}
                  {!receiptScanning && receiptScanText && (
                    <div className="mt-3 space-y-3">
                      <div className="p-3 bg-green-50 rounded-lg text-sm text-green-800">
                        <p className="font-semibold">Struk berhasil dibaca</p>
                        <p className="text-xs mt-1">Periksa ringkasan berikut sebelum disimpan.</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex justify-between gap-4 p-3 border-b border-gray-200"><span className="text-sm text-gray-500">Merchant</span><span className="text-sm font-medium text-gray-900 text-right">{formData.merchant || '-'}</span></div>
                        <div className="flex justify-between gap-4 p-3 border-b border-gray-200"><span className="text-sm text-gray-500">Tanggal</span><span className="text-sm font-medium text-gray-900">{formData.date || '-'}</span></div>
                        <div className="flex justify-between gap-4 p-3 border-b border-gray-200"><span className="text-sm text-gray-500">Total</span><span className="text-sm font-semibold text-red-600">{formData.amount ? formatCurrency(Number(formData.amount)) : '-'}</span></div>
                        <div className="flex justify-between gap-4 p-3 border-b border-gray-200"><span className="text-sm text-gray-500">Pembayaran</span><span className="text-sm font-medium text-gray-900">{formData.paymentMethod || '-'}</span></div>
                        <div className="flex justify-between gap-4 p-3"><span className="text-sm text-gray-500">Kategori</span><span className="text-sm font-medium text-gray-900">{formData.category || '-'}</span></div>
                      </div>
                      <button type="button" onClick={() => setEntryMode('manual')} className="w-full px-3 py-2 text-sm text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50">Perbaiki hasil scan</button>
                      <details className="p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700">
                        <summary className="font-medium cursor-pointer">Lihat seluruh teks struk</summary>
                        <pre className="mt-2 text-xs overflow-x-auto" style={{ whiteSpace: 'pre-wrap', maxHeight: 160 }}>{receiptScanText}</pre>
                      </details>
                    </div>
                  )}
                </div>
              )}

              {(editingExpense || entryMode === 'manual') && <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, transactionType: 'expense', category: 'Makan' });
                      setAutoPred(null);
                    }}
                    className={`min-w-0 px-2 py-2.5 rounded-lg border text-sm font-medium ${formData.transactionType === 'expense' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}
                  >
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, transactionType: 'income', category: 'Gaji' });
                      setAutoPred(null);
                    }}
                    className={`min-w-0 px-2 py-2.5 rounded-lg border text-sm font-medium ${formData.transactionType === 'income' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-600'}`}
                  >
                    Pemasukan
                  </button>
                </div>
              </div>

              <div className="finance-form-pair grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full min-w-0 px-2.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                  <div className="flex min-w-0">
                    <span className="flex items-center px-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-xs font-medium text-gray-500">Rp</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full min-w-0 px-2.5 py-2.5 text-sm border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="50.000"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sumber / Merchant</label>
                <input
                  type="text"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={formData.transactionType === 'income' ? 'Contoh: Perusahaan atau klien' : 'Nama toko/tempat'}
                />
              </div>

              <div className="finance-form-pair grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <label className="text-sm font-medium text-gray-700">Kategori</label>
                    {formData.transactionType === 'expense' && (
                      <button type="button" onClick={handleAutoCategorize} disabled={autoLoading} className="text-xs font-medium text-blue-600 disabled:opacity-60">
                        {autoLoading ? 'Memproses…' : 'Otomatis'}
                      </button>
                    )}
                  </div>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full min-w-0 px-2.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  {autoPred && <p className="mt-1 text-[11px] text-gray-500">Akurasi {Math.round(autoPred.confidence * 100)}%</p>}
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metode</label>
                  <select value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })} className="w-full min-w-0 px-2.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    {paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="Catatan opsional"
                />
              </div>

              {editingExpense && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ganti Foto Struk <span className="text-gray-400 font-normal">(opsional)</span></label>
                  <label className="flex items-center justify-center gap-3 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <Camera className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700">Pilih foto baru</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void handleReceiptChange(Array.from(event.target.files || []))} />
                  </label>
                </div>
              )}
              </div>}
            </div>
            </div>

            <div className="shrink-0 grid grid-cols-2 gap-2 px-4 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-gray-100 shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
              <button
                onClick={() => {
                  setShowAddExpense(false);
                  setEditingExpense(null);
                  setAutoPred(null);
                  setEntryMode('scan');
                  void handleReceiptChange([]);
                }}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={editingExpense ? () => handleUpdateExpense(editingExpense) : handleAddExpense}
                disabled={receiptScanning || (!editingExpense && entryMode === 'scan' && !receiptScanText)}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {receiptScanning ? 'Membaca Struk…' : editingExpense ? 'Update' : entryMode === 'scan' && !receiptScanText ? 'Upload Struk Dahulu' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Budget Modal */}
      {showAddBudget && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full p-4 sm:p-6 max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain">
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

            <div className="grid grid-cols-2 gap-2 mt-6 pb-[max(0px,env(safe-area-inset-bottom))]">
              <button
                onClick={() => setShowAddBudget(false)}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleAddBudget}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
          <div className="finance-history-header">
            <div>
              <h3 className="font-semibold text-gray-900">Riwayat Transaksi</h3>
              <p className="text-sm text-gray-500">{filteredTransactions.length} transaksi ditemukan</p>
            </div>
            <div className="finance-history-tools">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Cari transaksi..." className="w-full sm:w-56 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <select value={historyType} onChange={(event) => setHistoryType(event.target.value as typeof historyType)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="all">Semua jenis</option>
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            {filteredTransactions.map((expense) => (
              <div
                key={expense.id}
                className={`finance-history-row ${expense.transactionType === 'income' ? 'finance-history-income' : 'finance-history-expense'}`}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{expense.merchant || 'Tanpa sumber/merchant'}</p>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {expense.category}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${expense.transactionType === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {expense.transactionType === 'income' ? 'Pemasukan' : 'Pengeluaran'}
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

                <div className="finance-history-amount">
                  <p className={`font-semibold ${expense.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`} style={{ whiteSpace: 'nowrap' }}>
                    {expense.transactionType === 'income' ? '+' : '-'}{formatCurrency(expense.amount)}
                  </p>

                  {expense.hasReceipt && (
                    <button onClick={() => handleViewReceipt(expense.id)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Lihat foto struk">
                      <Camera className="w-4 h-4" />
                    </button>
                  )}

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

            {filteredTransactions.length === 0 && (
              <p className="text-center text-gray-500 py-8">Belum ada transaksi</p>
            )}
          </div>
        </div>
      </div>

      {selectedReceipt && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(17, 24, 39, 0.35)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }} onClick={() => setSelectedReceipt(null)}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setSelectedReceipt(null)} className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-lg text-gray-700" aria-label="Tutup foto struk">
              <X className="w-5 h-5" />
            </button>
            <img src={selectedReceipt} alt="Foto struk transaksi" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
