import { useEffect, useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, Trash2, Download, AlertTriangle, Camera, Search, X, WalletCards, CalendarDays, Pencil, ChevronDown, LoaderCircle, ArrowRightLeft, Landmark, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import ProcessingOverlay from '../components/ProcessingOverlay';
import { useModalFocusTrap } from '../utils/useModalFocusTrap';
import { formatCurrency } from '../utils/formatters';
import FinancialReportPreview from '../components/FinancialReportPreview';

type AutoPred = { category: string; confidence: number } | null;

const getLocalDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Expenses() {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    budgets,
    addBudget,
    updateBudget,
    deleteBudget,
    fundAccounts,
    fundTransfers,
    updateFundAccount,
    addFundTransfer,
    deleteFundTransfer,
    createFundAccount,
    deleteFundAccount,
    customCategories,
  } = useData();

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [savingBudget, setSavingBudget] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState<string | null>(null);
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
  const [historyDate, setHistoryDate] = useState(getLocalDateValue);
  const [summaryMode, setSummaryMode] = useState<'all' | 'daily'>('all');
  const [summarySource, setSummarySource] = useState('all');
  const [summaryDate, setSummaryDate] = useState(getLocalDateValue);
  const [budgetDate, setBudgetDate] = useState(getLocalDateValue);
  const [accountDialog, setAccountDialog] = useState<string | null>(null);
  const [transferDialog, setTransferDialog] = useState(false);
  const [savingFunds, setSavingFunds] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', openingBalance: '' });
  const [transferForm, setTransferForm] = useState({ fromSource: 'bank', toSource: 'cash', amount: '', date: getLocalDateValue(), notes: '' });
  const anyFinanceDialogOpen = showAddExpense || Boolean(editingExpense) || showAddBudget || Boolean(selectedReceipt) || Boolean(accountDialog) || transferDialog || showReportPreview;
  useModalFocusTrap(anyFinanceDialogOpen, '.finance-transaction-overlay, .fixed[role="dialog"]');

  useEffect(() => {
    if (!anyFinanceDialogOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || savingExpense || savingBudget || receiptScanning) return;
      setShowAddExpense(false);
      setEditingExpense(null);
      setShowAddBudget(false);
      setSelectedReceipt(null);
      setAccountDialog(null);
      setTransferDialog(false);
      setShowReportPreview(false);
    };
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [anyFinanceDialogOpen, savingExpense, savingBudget, receiptScanning]);

  const openAccountDialog = (source: string) => {
    const account = fundAccounts.find((item) => item.source === source);
    setAccountForm({ name: account?.name || '', openingBalance: String(account?.openingBalance || '') });
    setAccountDialog(source);
  };

  const openNewAccountDialog = () => {
    setAccountForm({ name: '', openingBalance: '' });
    setAccountDialog('__new__');
  };

  const handleSaveAccount = async () => {
    if (!accountDialog) return;
    const openingBalance = Number(accountForm.openingBalance || 0);
    if (!accountForm.name.trim() || !Number.isFinite(openingBalance) || openingBalance < 0) return toast.error('Nama dan saldo awal harus valid');
    setSavingFunds(true);
    try {
      if (accountDialog === '__new__') await createFundAccount({ name: accountForm.name.trim(), openingBalance });
      else await updateFundAccount(accountDialog, { name: accountForm.name.trim(), openingBalance });
      setAccountDialog(null);
      toast.success('Sumber saldo berhasil diperbarui');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Sumber saldo gagal disimpan'); }
    finally { setSavingFunds(false); }
  };

  const handleDeleteAccount = async () => {
    if (!accountDialog || accountDialog === '__new__' || !window.confirm('Hapus sumber saldo ini?')) return;
    setSavingFunds(true);
    try {
      await deleteFundAccount(accountDialog);
      setAccountDialog(null);
      toast.success('Sumber saldo berhasil dihapus');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Sumber saldo gagal dihapus'); }
    finally { setSavingFunds(false); }
  };

  const handleSaveTransfer = async () => {
    const amount = Number(transferForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Nominal transfer harus lebih dari 0');
    setSavingFunds(true);
    try {
      await addFundTransfer({ ...transferForm, amount });
      setTransferDialog(false);
      setTransferForm({ fromSource: 'bank', toSource: 'cash', amount: '', date: getLocalDateValue(), notes: '' });
      toast.success('Transfer saldo berhasil dicatat');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Transfer gagal disimpan'); }
    finally { setSavingFunds(false); }
  };

  const handleDeleteTransfer = async (id: string) => {
    if (!window.confirm('Hapus catatan transfer ini?')) return;
    setSavingFunds(true);
    try {
      await deleteFundTransfer(id);
      toast.success('Catatan transfer dihapus');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Transfer gagal dihapus');
    } finally {
      setSavingFunds(false);
    }
  };

  // Form states
  const [formData, setFormData] = useState({
    transactionType: 'expense' as 'income' | 'expense',
    date: getLocalDateValue(),
    amount: '',
    category: 'Makan',
    paymentMethod: 'Cash',
    fundSource: 'bank',
    merchant: '',
    notes: '',
  });

  const [budgetFormData, setBudgetFormData] = useState({
    category: 'Makan',
    amount: '',
    period: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    fundSource: 'all',
    referenceDate: getLocalDateValue(),
  });

  const expenseCategories = Array.from(new Set(['Makan', 'Minum', 'Makan & Minum', 'Transport', 'Belanja', 'Top Up', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya', ...customCategories.filter((item) => item.transactionType === 'expense').map((item) => item.name)]));
  const incomeCategories = Array.from(new Set(['Gaji', 'Bonus', 'Usaha', 'Investasi', 'Hadiah', 'Lainnya', ...customCategories.filter((item) => item.transactionType === 'income').map((item) => item.name)]));
  const budgetCategories = ['Keseluruhan', ...expenseCategories];
  const categories = formData.transactionType === 'income' ? incomeCategories : expenseCategories;
  const paymentMethods = ['Cash', 'QRIS', 'Debit Card', 'Credit Card', 'E-Wallet', 'Transfer Bank'];

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
      fundSource: exp.fundSource,
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
      const matchesDate = transaction.date === historyDate;
      const matchesType = historyType === 'all' || transaction.transactionType === historyType;
      const matchesSearch = !search || [transaction.merchant, transaction.category, transaction.notes]
        .some((value) => value?.toLowerCase().includes(search));
      return matchesDate && matchesType && matchesSearch;
    });
  }, [expenses, historyDate, historySearch, historyType]);

  const selectedHistoryDateLabel = new Date(`${historyDate}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
        fundSource: (result.payment_method || current.paymentMethod) === 'Cash' ? 'cash' : current.fundSource,
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

  const financeSummary = useMemo(() => {
    const transactionsInPeriod = summaryMode === 'daily'
      ? expenses.filter((transaction) => transaction.date === summaryDate)
      : expenses;
    const summaryTransactions = summarySource === 'all'
      ? transactionsInPeriod
      : transactionsInPeriod.filter((transaction) => transaction.fundSource === summarySource);
    const allExpenses = summaryTransactions.filter(e => e.transactionType !== 'income');
    const allIncome = summaryTransactions.filter(e => e.transactionType === 'income');
    const totalExpense = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = allIncome.reduce((sum, e) => sum + e.amount, 0);

    return {
      totalExpense,
      totalIncome,
      balance: totalIncome - totalExpense,
      count: summaryTransactions.length,
    };
  }, [expenses, summaryDate, summaryMode, summarySource]);

  const summaryDateLabel = new Date(`${summaryDate}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const budgetOverview = useMemo(() => {
    const selectedDate = new Date(`${budgetDate}T00:00:00`);
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - ((selectedDate.getDay() + 6) % 7));

    const isBudgetForSelectedPeriod = (referenceDateValue: string, period: string) => {
      const referenceDate = new Date(`${referenceDateValue}T00:00:00`);
      if (period === 'daily') return referenceDateValue === budgetDate;
      if (period === 'weekly') {
        const referenceWeekStart = new Date(referenceDate);
        referenceWeekStart.setDate(referenceDate.getDate() - ((referenceDate.getDay() + 6) % 7));
        return referenceWeekStart.getTime() === weekStart.getTime();
      }
      if (period === 'yearly') return referenceDate.getFullYear() === selectedDate.getFullYear();
      return referenceDate.getMonth() === selectedDate.getMonth()
        && referenceDate.getFullYear() === selectedDate.getFullYear();
    };

    const isInCurrentPeriod = (dateValue: string, period: string) => {
      const date = new Date(`${dateValue}T00:00:00`);
      if (period === 'daily') return dateValue === budgetDate;
      if (period === 'weekly') {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        return date >= weekStart && date < weekEnd;
      }
      if (period === 'yearly') return date.getFullYear() === selectedDate.getFullYear();
      return date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
    };

    return budgets.filter((budget) => isBudgetForSelectedPeriod(budget.referenceDate, budget.period)).map((budget) => {
      const spent = expenses
        .filter((expense) => expense.transactionType === 'expense'
          && (budget.category === 'Keseluruhan' || expense.category === budget.category)
          && (budget.fundSource === 'all' || expense.fundSource === budget.fundSource)
          && isInCurrentPeriod(expense.date, budget.period))
        .reduce((sum, expense) => sum + expense.amount, 0);
      return {
        ...budget,
        spent,
        remaining: budget.amount - spent,
        percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
      };
    });
  }, [budgetDate, budgets, expenses]);

  const budgetDateLabel = new Date(`${budgetDate}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const budgetPeriodLabels: Record<string, string> = {
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    yearly: 'Tahunan',
  };

  const fundSourceLabels: Record<string, string> = Object.fromEntries([
    ['all', 'Semua saldo'],
    ...fundAccounts.map((account) => [account.source, account.name]),
  ]);

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

    setSavingExpense(true);
    try {
      await addExpense({
        transactionType: formData.transactionType,
        date: formData.date,
        amount: amountNum,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        fundSource: formData.fundSource,
        merchant: formData.merchant,
        notes: formData.notes,
        predictedCategory,
        confidence,
        receiptFile: receiptFile || undefined,
      });

      setHistoryDate(formData.date);
      toast.success('Transaksi berhasil disimpan', {
        description: `${formData.transactionType === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${formatCurrency(amountNum)} langsung ditampilkan di riwayat.`,
        duration: 4000,
      });
      setShowAddExpense(false);
      setAutoPred(null);
      setEntryMode('scan');
      void handleReceiptChange([]);
      setFormData({
        transactionType: 'expense',
        date: getLocalDateValue(),
        amount: '',
        category: 'Makan',
        paymentMethod: 'Cash',
        fundSource: 'bank',
        merchant: '',
        notes: '',
      });
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menambahkan transaksi');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleUpdateExpense = async (id: string) => {
    const amountNum = Number(formData.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('Jumlah harus > 0');
      return;
    }

    setSavingExpense(true);
    try {
      await updateExpense(id, {
        transactionType: formData.transactionType,
        date: formData.date,
        amount: amountNum,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        fundSource: formData.fundSource,
        merchant: formData.merchant,
        notes: formData.notes,
        receiptFile: receiptFile || undefined,
      });

      setHistoryDate(formData.date);
      toast.success('Perubahan berhasil disimpan', {
        description: 'Transaksi yang diperbarui langsung ditampilkan di riwayat.',
        duration: 4000,
      });
      setEditingExpense(null);
      setAutoPred(null);
      void handleReceiptChange([]);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal update transaksi');
    } finally {
      setSavingExpense(false);
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

  const resetBudgetForm = () => {
    setEditingBudget(null);
    setBudgetFormData({ category: 'Makan', amount: '', period: 'monthly', fundSource: 'all', referenceDate: budgetDate });
  };

  const openAddBudget = () => {
    resetBudgetForm();
    setShowAddBudget(true);
  };

  const openEditBudget = (budget: typeof budgets[number]) => {
    setEditingBudget(budget.id);
    setBudgetFormData({
      category: budget.category,
      amount: String(budget.amount),
      period: budget.period,
      fundSource: budget.fundSource,
      referenceDate: budget.referenceDate,
    });
    setShowAddBudget(true);
  };

  const handleSaveBudget = async () => {
    if (!budgetFormData.amount) {
      toast.error('Mohon masukkan jumlah budget!');
      return;
    }

    const amountNum = Number(budgetFormData.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('Budget harus > 0');
      return;
    }

    setSavingBudget(true);
    try {
      const payload = {
        category: budgetFormData.category,
        amount: amountNum,
        period: budgetFormData.period,
        fundSource: budgetFormData.fundSource,
        referenceDate: budgetFormData.referenceDate,
      };
      if (editingBudget) await updateBudget(editingBudget, payload);
      else await addBudget(payload);

      toast.success(editingBudget ? 'Budget berhasil diperbarui' : 'Budget berhasil disimpan', {
        description: `${budgetFormData.category} · ${budgetPeriodLabels[budgetFormData.period]}`,
        duration: 4000,
      });
      setShowAddBudget(false);
      resetBudgetForm();
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan budget');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Yakin ingin menghapus budget ini?')) return;
    setDeletingBudget(id);
    try {
      await deleteBudget(id);
      toast.success('Budget berhasil dihapus');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghapus budget');
    } finally {
      setDeletingBudget(null);
    }
  };

  const handleExportCSV = (transactions = expenses, scope: 'filtered' | 'all' = 'all') => {
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csvContent = [
      ['Tanggal', 'Jenis', 'Kategori', 'Sumber/Merchant', 'Metode', 'Sumber Saldo', 'Jumlah', 'Catatan'].map(escapeCsv).join(','),
      ...transactions.map(e =>
        [e.date, e.transactionType, e.category, e.merchant, e.paymentMethod, fundSourceLabels[e.fundSource], e.amount, e.notes].map(escapeCsv).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fintrack-transaksi-${scope === 'filtered' ? historyDate : 'semua'}.csv`;
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success('Data berhasil diekspor!');
  };

  return (
    <div className="space-y-6">
      {(savingExpense || savingBudget || receiptScanning || savingFunds) && (
        <ProcessingOverlay message={savingFunds ? 'Sedang menyimpan saldo…' : receiptScanning ? 'Sedang membaca struk…' : savingBudget ? 'Sedang menyimpan budget…' : editingExpense ? 'Sedang menyimpan perubahan…' : 'Sedang menyimpan transaksi…'} />
      )}
      {/* Header */}
      <div className="finance-page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keuangan</h1>
          <p className="text-gray-600">Kelola pemasukan, pengeluaran, dan budget Anda</p>
        </div>
        <div className="finance-header-actions">
          <button
            onClick={() => setShowReportPreview(true)}
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

      {/* Finance Summary */}
      <section>
        <div className="finance-summary-header mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">Ringkasan {summaryMode === 'all' ? 'Keseluruhan' : summaryDateLabel}</h3>
            <p className="text-sm text-gray-500">{summaryMode === 'all' ? 'Akumulasi seluruh transaksi Anda' : 'Pemasukan dan pengeluaran pada hari yang dipilih'}</p>
          </div>
          <div className="finance-summary-controls">
            <select
              value={summarySource}
              onChange={(event) => setSummarySource(event.target.value as typeof summarySource)}
              aria-label="Pilih sumber saldo"
              className="finance-summary-date px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="all">Semua saldo</option>
              {fundAccounts.map((account) => <option key={account.source} value={account.source}>{account.name}</option>)}
            </select>
            <div className="finance-summary-mode">
              <button type="button" onClick={() => setSummaryMode('all')} className={summaryMode === 'all' ? 'finance-summary-mode-active' : ''}>Keseluruhan</button>
              <button type="button" onClick={() => setSummaryMode('daily')} className={summaryMode === 'daily' ? 'finance-summary-mode-active' : ''}>Per Hari</button>
            </div>
            {summaryMode === 'daily' && (
              <input
                type="date"
                aria-label="Pilih tanggal ringkasan keuangan"
                value={summaryDate}
                onChange={(event) => setSummaryDate(event.target.value || getLocalDateValue())}
                className="finance-summary-date px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              />
            )}
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
                  <p className="finance-balance-label">Saldo {fundSourceLabels[summarySource]}</p>
                  <p className="finance-balance-period">Pemasukan dikurangi pengeluaran</p>
                </div>
              </div>
              <p className="finance-balance-value">{formatCurrency(financeSummary.balance)}</p>
              <div className="finance-balance-footer">
                <span className={`finance-cashflow-badge ${financeSummary.balance >= 0 ? 'finance-cashflow-positive' : 'finance-cashflow-negative'}`}>
                  {financeSummary.balance >= 0 ? 'Arus kas positif' : 'Arus kas negatif'}
                </span>
                <span className="finance-transaction-count">{financeSummary.count} transaksi</span>
              </div>
            </div>
          </div>
          <div className="finance-flow-grid">
            <div className="finance-flow-card finance-income-card">
              <p className="text-sm text-gray-600">Pemasukan</p>
              <p className="text-xl font-bold text-green-600">+{formatCurrency(financeSummary.totalIncome)}</p>
            </div>
            <div className="finance-flow-card finance-expense-card">
              <p className="text-sm text-gray-600">Pengeluaran</p>
              <p className="text-xl font-bold text-red-600">-{formatCurrency(financeSummary.totalExpense)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div><h3 className="font-semibold text-gray-900">Sumber Saldo</h3><p className="text-sm text-gray-500">Saldo rekening dan cash dihitung dari saldo awal, transaksi, serta transfer.</p></div>
          <div className="flex flex-col sm:flex-row gap-2"><button type="button" onClick={openNewAccountDialog} className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"><Plus className="w-4 h-4" /> Tambah Sumber</button><button type="button" onClick={() => { const [first, second] = fundAccounts; if (first && second) setTransferForm((current) => ({ ...current, fromSource: first.source, toSource: second.source })); setTransferDialog(true); }} disabled={fundAccounts.length < 2} className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"><ArrowRightLeft className="w-4 h-4" /> Transfer Saldo</button></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fundAccounts.map((account) => {
            const Icon = account.source === 'bank' ? Landmark : Banknote;
            return <button key={account.source} type="button" onClick={() => openAccountDialog(account.source)} className="text-left min-w-0 rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
              <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-sm text-gray-600"><Icon className="w-4 h-4" />{account.name}</span><Pencil className="w-4 h-4 text-gray-400" /></div>
              <p className={`mt-3 text-xl font-semibold tabular-nums ${account.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(account.balance)}</p>
              <p className="text-xs text-gray-500 mt-1">Saldo awal {formatCurrency(account.openingBalance)}</p>
            </button>;
          })}
        </div>
        {fundTransfers.length > 0 && <div className="mt-4 pt-4 border-t border-gray-200"><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Transfer terbaru</p>{fundTransfers.slice(0, 3).map((transfer) => <div key={transfer.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 text-sm"><span className="min-w-0 text-gray-600">{fundSourceLabels[transfer.fromSource]} → {fundSourceLabels[transfer.toSource]} · {new Date(`${transfer.date}T00:00:00`).toLocaleDateString('id-ID')}</span><div className="flex items-center justify-between sm:justify-end gap-2 shrink-0"><span className="font-medium tabular-nums">{formatCurrency(transfer.amount)}</span><button aria-label="Hapus transfer" onClick={() => void handleDeleteTransfer(transfer.id)} className="p-1.5 text-red-500 rounded-md hover:bg-red-50"><Trash2 className="w-4 h-4" /></button></div></div>)}</div>}
      </section>

      {/* Budget */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="space-y-4">
          <div className="finance-budget-header">
            <div>
              <h3 className="font-semibold text-gray-900">Budget</h3>
              <p className="text-sm text-gray-500">Perhitungan periode yang mencakup {budgetDateLabel}</p>
            </div>
            <div className="finance-budget-actions">
              <div className="finance-budget-date relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  aria-label="Pilih tanggal acuan budget"
                  value={budgetDate}
                  onChange={(event) => {
                    const selectedDate = event.target.value || getLocalDateValue();
                    setBudgetDate(selectedDate);
                    setHistoryDate(selectedDate);
                  }}
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                />
              </div>
              <button
                onClick={openAddBudget}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                <Plus className="w-4 h-4" /> Atur Budget
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {budgetOverview.map((budget) => {
              const isOverBudget = budget.remaining < 0;

              return (
                <div key={budget.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-gray-900">{budget.category}</span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">{fundSourceLabels[budget.fundSource]}</span>
                      <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">{budgetPeriodLabels[budget.period] || budget.period}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-end justify-between gap-3 mb-2">
                      <div>
                        <p className="text-xs text-gray-500">Terpakai</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(budget.spent)}</p>
                      </div>
                      <p className="text-sm text-gray-500">dari {formatCurrency(budget.amount)}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${isOverBudget ? 'bg-red-500' : budget.percentage >= 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={isOverBudget ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {isOverBudget ? `Melebihi ${formatCurrency(Math.abs(budget.remaining))}` : `Sisa ${formatCurrency(budget.remaining)}`}
                    </span>
                    <span className={isOverBudget ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {Math.round(budget.percentage)}%
                      {isOverBudget && <AlertTriangle className="inline-block w-3.5 h-3.5 ml-1" />}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => openEditBudget(budget)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBudget(budget.id)}
                      disabled={deletingBudget === budget.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {deletingBudget === budget.id ? 'Menghapus…' : 'Hapus'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {budgetOverview.length === 0 && (
            <div className="text-center py-8 px-4 border border-dashed border-gray-300 rounded-xl">
              <p className="font-medium text-gray-700">Belum ada budget</p>
              <p className="text-sm text-gray-500 mt-1">Atur batas harian, bulanan, atau tahunan untuk kategori pengeluaran Anda.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      {(showAddExpense || editingExpense) && (
        <div className="finance-transaction-overlay fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }} role="dialog" aria-modal="true" aria-labelledby="transaction-dialog-title">
          <div className="finance-transaction-dialog bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col overflow-hidden">
            <div className="finance-transaction-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pt-4 sm:px-6 sm:pt-6">
            <h3 id="transaction-dialog-title" className="finance-transaction-title text-xl font-bold text-gray-900 mb-4">
              {editingExpense ? 'Edit Transaksi' : 'Tambah Transaksi'}
            </h3>

            <div className="space-y-4">
              {!editingExpense && (
                <div className="finance-entry-tabs grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                  <button type="button" onClick={() => setEntryMode('scan')} className={`px-3 py-2 rounded-lg text-sm font-medium ${entryMode === 'scan' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>
                    Scan Struk
                  </button>
                  <button type="button" onClick={() => setEntryMode('manual')} className={`px-3 py-2 rounded-lg text-sm font-medium ${entryMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>
                    Input Manual
                  </button>
                </div>
              )}

              {!editingExpense && entryMode === 'scan' && (
                <div className="finance-scan-panel p-4 bg-blue-50 border border-blue-200 rounded-xl">
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
              <div className="finance-type-selector rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, transactionType: 'expense', category: 'Makan' });
                      setAutoPred(null);
                    }}
                    className={`finance-type-option min-w-0 px-2 py-2.5 rounded-lg border text-sm font-medium ${formData.transactionType === 'expense' ? 'finance-type-expense-active bg-red-50 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}
                  >
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, transactionType: 'income', category: 'Gaji' });
                      setAutoPred(null);
                    }}
                    className={`finance-type-option min-w-0 px-2 py-2.5 rounded-lg border text-sm font-medium ${formData.transactionType === 'income' ? 'finance-type-income-active bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-600'}`}
                  >
                    Pemasukan
                  </button>
                </div>
              </div>

              <div className="finance-form-pair grid grid-cols-2 gap-3">
                <div className="finance-date-field min-w-0 overflow-hidden">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="finance-date-input block w-full min-w-0 max-w-full px-2.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sumber Saldo</label>
                <select value={formData.fundSource} onChange={(event) => setFormData({ ...formData, fundSource: event.target.value })} className="w-full min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  {fundAccounts.map((account) => <option key={account.source} value={account.source}>{account.name}</option>)}
                </select>
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

            <div className="finance-transaction-actions shrink-0 grid grid-cols-2 gap-2 px-4 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-gray-100 shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
              <button
                disabled={savingExpense || receiptScanning}
                onClick={() => {
                  setShowAddExpense(false);
                  setEditingExpense(null);
                  setAutoPred(null);
                  setEntryMode('scan');
                  void handleReceiptChange([]);
                }}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={editingExpense ? () => handleUpdateExpense(editingExpense) : handleAddExpense}
                disabled={savingExpense || receiptScanning || (!editingExpense && entryMode === 'scan' && !receiptScanText)}
                className="min-w-0 inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {(savingExpense || receiptScanning) && <LoaderCircle className="w-4 h-4 animate-spin" />}
                {savingExpense ? (editingExpense ? 'Menyimpan Perubahan…' : 'Menyimpan…') : receiptScanning ? 'Membaca Struk…' : editingExpense ? 'Update' : entryMode === 'scan' && !receiptScanText ? 'Upload Struk Dahulu' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Budget Modal */}
      {showAddBudget && (
        <div className="finance-transaction-overlay fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }} role="dialog" aria-modal="true" aria-labelledby="budget-dialog-title">
          <div className="finance-transaction-dialog bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full p-4 sm:p-6 max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain">
            <h3 id="budget-dialog-title" className="text-xl font-bold text-gray-900 mb-4">{editingBudget ? 'Edit Budget' : 'Atur Budget'}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={budgetFormData.category}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {budgetCategories.map(cat => (
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
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, period: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                  <option value="yearly">Tahunan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sumber Saldo</label>
                <select
                  value={budgetFormData.fundSource}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, fundSource: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua saldo</option>
                  {fundAccounts.map((account) => <option key={account.source} value={account.source}>{account.name}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">Pemakaian budget hanya dihitung dari sumber saldo yang dipilih.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Acuan</label>
                <input
                  type="date"
                  value={budgetFormData.referenceDate}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, referenceDate: e.target.value })}
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Budget akan tersimpan khusus untuk periode yang mencakup tanggal ini.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-6 pb-[max(0px,env(safe-area-inset-bottom))]">
              <button
                onClick={() => { setShowAddBudget(false); resetBudgetForm(); }}
                disabled={savingBudget}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleSaveBudget}
                disabled={savingBudget}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <span className="inline-flex items-center justify-center gap-2">{savingBudget && <LoaderCircle className="w-4 h-4 animate-spin" />}{savingBudget ? 'Menyimpan…' : editingBudget ? 'Simpan Perubahan' : 'Simpan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {accountDialog && (
        <div className="finance-transaction-overlay fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }} role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
          <div className="finance-transaction-dialog bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full p-4 sm:p-6">
            <h3 id="account-dialog-title" className="text-xl font-bold text-gray-900">{accountDialog === '__new__' ? 'Tambah Sumber Saldo' : 'Atur Sumber Saldo'}</h3>
            <p className="text-sm text-gray-500 mt-1 mb-5">Saldo awal menjadi titik awal sebelum transaksi yang sudah tercatat.</p>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama</label><input value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Saldo Awal</label><div className="flex min-w-0"><span className="px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg text-gray-500">Rp</span><input type="number" min="0" value={accountForm.openingBalance} onChange={(event) => setAccountForm({ ...accountForm, openingBalance: event.target.value })} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500" placeholder="0" /></div></div>
            </div>
            {accountDialog !== '__new__' && !['bank', 'cash'].includes(accountDialog) && <button type="button" onClick={() => void handleDeleteAccount()} className="mt-4 text-sm font-medium text-red-600 hover:text-red-700">Hapus sumber saldo</button>}
            <div className="grid grid-cols-2 gap-2 mt-6"><button type="button" onClick={() => setAccountDialog(null)} className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg">Batal</button><button type="button" onClick={() => void handleSaveAccount()} className="px-3 py-2.5 bg-blue-600 text-white rounded-lg">Simpan</button></div>
          </div>
        </div>
      )}

      {transferDialog && (
        <div className="finance-transaction-overlay fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }} role="dialog" aria-modal="true" aria-labelledby="transfer-dialog-title">
          <div className="finance-transaction-dialog bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full p-4 sm:p-6">
            <h3 id="transfer-dialog-title" className="text-xl font-bold text-gray-900">Transfer Antar Saldo</h3>
            <p className="text-sm text-gray-500 mt-1 mb-5">Pemindahan saldo tidak dihitung sebagai pemasukan atau pengeluaran.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Dari</label><select value={transferForm.fromSource} onChange={(event) => { const fromSource = event.target.value; const destination = fundAccounts.find((account) => account.source !== fromSource)?.source || ''; setTransferForm({ ...transferForm, fromSource, toSource: destination }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg">{fundAccounts.map((account) => <option key={account.source} value={account.source}>{account.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ke</label><select value={transferForm.toSource} onChange={(event) => setTransferForm({ ...transferForm, toSource: event.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">{fundAccounts.filter((account) => account.source !== transferForm.fromSource).map((account) => <option key={account.source} value={account.source}>{account.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nominal</label><input type="number" min="1" value={transferForm.amount} onChange={(event) => setTransferForm({ ...transferForm, amount: event.target.value })} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg" placeholder="50000" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label><input type="date" value={transferForm.date} onChange={(event) => setTransferForm({ ...transferForm, date: event.target.value })} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label><input value={transferForm.notes} onChange={(event) => setTransferForm({ ...transferForm, notes: event.target.value })} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Opsional" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-6"><button type="button" onClick={() => setTransferDialog(false)} className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg">Batal</button><button type="button" onClick={() => void handleSaveTransfer()} className="px-3 py-2.5 bg-blue-600 text-white rounded-lg">Simpan Transfer</button></div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="finance-history-header">
            <div>
              <h3 className="font-semibold text-gray-900">Transaksi {historyDate === getLocalDateValue() ? 'Hari Ini' : selectedHistoryDateLabel}</h3>
              <p className="text-sm text-gray-500">{filteredTransactions.length} transaksi ditemukan</p>
            </div>
            <div className="finance-history-tools">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Cari transaksi..." className="w-full sm:w-56 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="finance-history-date relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  aria-label="Filter transaksi berdasarkan tanggal"
                  value={historyDate}
                  onChange={(event) => setHistoryDate(event.target.value || getLocalDateValue())}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <select value={historyType} onChange={(event) => setHistoryType(event.target.value as typeof historyType)} className="finance-history-type pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="all">Semua jenis</option>
                  <option value="income">Pemasukan</option>
                  <option value="expense">Pengeluaran</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
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
                        Kategori otomatis: {(expense.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(expense.date).toLocaleDateString('id-ID')} • {expense.paymentMethod} • {fundSourceLabels[expense.fundSource]}
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
              <div className="finance-history-empty">
                <div className="finance-history-empty-icon"><CalendarDays className="w-5 h-5" /></div>
                <p className="font-medium text-gray-700">Belum ada transaksi</p>
                <p className="text-sm text-gray-500 mt-1">Tidak ada transaksi pada {selectedHistoryDateLabel}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedReceipt && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(17, 24, 39, 0.35)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }} onClick={() => setSelectedReceipt(null)} role="dialog" aria-modal="true" aria-label="Foto struk transaksi">
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setSelectedReceipt(null)} className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-lg text-gray-700" aria-label="Tutup foto struk">
              <X className="w-5 h-5" />
            </button>
            <img src={selectedReceipt} alt="Foto struk transaksi" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}

      {showReportPreview && (
        <FinancialReportPreview
          allTransactions={expenses}
          filteredTransactions={filteredTransactions}
          filteredPeriodLabel={selectedHistoryDateLabel}
          fundSourceLabels={fundSourceLabels}
          onClose={() => setShowReportPreview(false)}
          onDownloadCsv={handleExportCSV}
        />
      )}
    </div>
  );
}
