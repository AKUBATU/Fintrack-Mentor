import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer, WalletCards, X } from 'lucide-react';
import type { Budget, ExpenseTransaction } from '../contexts/DataContext';
import { formatCurrency } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';

interface FinancialReportPreviewProps {
  allTransactions: ExpenseTransaction[];
  budgets: Budget[];
  initialDate: string;
  fundSourceLabels: Record<string, string>;
  onClose: () => void;
  onDownloadCsv: (transactions: ExpenseTransaction[], periodKey: string) => void;
}

type ReportPeriod = 'daily' | 'monthly' | 'range' | 'yearly' | 'all';

const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const budgetBounds = (budget: Budget) => {
  const reference = new Date(`${budget.referenceDate}T00:00:00`);
  const start = new Date(reference);
  const end = new Date(reference);
  if (budget.period === 'weekly') {
    start.setDate(reference.getDate() - ((reference.getDay() + 6) % 7));
    end.setTime(start.getTime()); end.setDate(start.getDate() + 6);
  } else if (budget.period === 'monthly') {
    start.setDate(1); end.setMonth(reference.getMonth() + 1, 0);
  } else if (budget.period === 'yearly') {
    start.setMonth(0, 1); end.setMonth(11, 31);
  }
  return { start: toDateValue(start), end: toDateValue(end) };
};

const formatDate = (value: string, locale: string) => new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default function FinancialReportPreview({
  allTransactions,
  budgets,
  initialDate,
  fundSourceLabels,
  onClose,
  onDownloadCsv,
}: FinancialReportPreviewProps) {
  const { language, locale, t } = useLanguage();
  const isEnglish = language === 'en';
  const initialMonth = initialDate.slice(0, 7);
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialDate.slice(0, 4));
  const [rangeStart, setRangeStart] = useState(`${initialMonth}-01`);
  const [rangeEnd, setRangeEnd] = useState(initialDate);

  const transactions = useMemo(() => allTransactions
    .filter((transaction) => {
      if (period === 'daily') return transaction.date === selectedDate;
      if (period === 'monthly') return transaction.date.startsWith(selectedMonth);
      if (period === 'yearly') return transaction.date.startsWith(selectedYear);
      if (period === 'range') return transaction.date >= rangeStart && transaction.date <= rangeEnd;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date)), [allTransactions, period, rangeEnd, rangeStart, selectedDate, selectedMonth, selectedYear]);

  const summary = useMemo(() => {
    const income = transactions
      .filter((transaction) => transaction.transactionType === 'income')
      .reduce((total, transaction) => total + transaction.amount, 0);
    const expense = transactions
      .filter((transaction) => transaction.transactionType === 'expense')
      .reduce((total, transaction) => total + transaction.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const expenseBreakdown = useMemo(() => {
    const categories = new Map<string, number>();
    const sources = new Map<string, number>();
    transactions.filter((transaction) => transaction.transactionType === 'expense').forEach((transaction) => {
      categories.set(transaction.category, (categories.get(transaction.category) || 0) + transaction.amount);
      const source = fundSourceLabels[transaction.fundSource] || transaction.fundSource;
      sources.set(source, (sources.get(source) || 0) + transaction.amount);
    });
    const sortValues = (entries: Map<string, number>) => Array.from(entries.entries()).sort((a, b) => b[1] - a[1]);
    return { categories: sortValues(categories), sources: sortValues(sources) };
  }, [fundSourceLabels, transactions]);

  const reportPeriod = useMemo(() => {
    if (period === 'daily') return formatDate(selectedDate, locale);
    if (period === 'monthly') return new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    if (period === 'yearly') return isEnglish ? `Year ${selectedYear}` : `Tahun ${selectedYear}`;
    if (period === 'range') return `${formatDate(rangeStart, locale)} – ${formatDate(rangeEnd, locale)}`;
    if (transactions.length === 0) return t('report.all');
    const dates = transactions.map((transaction) => transaction.date).sort();
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    return firstDate === lastDate ? formatDate(firstDate, locale) : `${formatDate(firstDate, locale)} – ${formatDate(lastDate, locale)}`;
  }, [isEnglish, locale, period, rangeEnd, rangeStart, selectedDate, selectedMonth, selectedYear, t, transactions]);

  const periodKey = period === 'daily' ? selectedDate
    : period === 'monthly' ? selectedMonth
      : period === 'yearly' ? selectedYear
        : period === 'range' ? `${rangeStart}_${rangeEnd}` : 'semua';

  const reportBounds = period === 'daily' ? { start: selectedDate, end: selectedDate }
    : period === 'monthly' ? { start: `${selectedMonth}-01`, end: toDateValue(new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0)) }
      : period === 'yearly' ? { start: `${selectedYear}-01-01`, end: `${selectedYear}-12-31` }
        : period === 'range' ? { start: rangeStart, end: rangeEnd } : null;

  const budgetRows = useMemo(() => budgets.flatMap((budget) => {
    const bounds = budgetBounds(budget);
    if (reportBounds && (bounds.end < reportBounds.start || bounds.start > reportBounds.end)) return [];
    const spent = allTransactions.filter((transaction) => transaction.transactionType === 'expense'
      && transaction.date >= bounds.start && transaction.date <= bounds.end
      && (budget.category === 'Keseluruhan' || transaction.category === budget.category)
      && (budget.fundSource === 'all' || transaction.fundSource === budget.fundSource))
      .reduce((total, transaction) => total + transaction.amount, 0);
    return [{ ...budget, spent, remaining: budget.amount - spent, percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0 }];
  }), [allTransactions, budgets, reportBounds?.end, reportBounds?.start]);

  const budgetPeriodLabels: Record<Budget['period'], string> = isEnglish
    ? { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }
    : { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan' };

  return (
    <div className="financial-report-overlay fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="financial-report-title">
      <div className="financial-report-modal flex h-full w-full flex-col overflow-hidden bg-gray-100 sm:h-auto sm:max-h-[94dvh] sm:max-w-5xl sm:rounded-xl">
        <div className="financial-report-toolbar flex shrink-0 flex-col gap-3 border-b border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 id="financial-report-title" className="font-semibold text-gray-900">{t('report.previewFinance')}</h2>
            <p className="text-xs text-gray-500">{isEnglish ? 'Review the document before saving or downloading it.' : 'Periksa dokumen sebelum menyimpan atau mengunduhnya.'}</p>
          </div>
          <div className="financial-report-actions flex flex-wrap items-center gap-2">
            <select value={period} onChange={(event) => setPeriod(event.target.value as ReportPeriod)} aria-label="Pilih periode laporan" className="financial-report-period min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm sm:flex-none">
              <option value="daily">{isEnglish ? 'Daily' : 'Harian'}</option>
              <option value="monthly">{t('report.monthly')}</option>
              <option value="range">{isEnglish ? 'Date range' : 'Rentang tanggal'}</option>
              <option value="yearly">{t('report.yearly')}</option>
              <option value="all">{t('report.all')}</option>
            </select>
            {period === 'daily' && <input type="date" aria-label="Tanggal laporan" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value || initialDate)} className="financial-report-period-input rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />}
            {period === 'monthly' && <input type="month" aria-label="Bulan laporan" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value || initialMonth)} className="financial-report-period-input rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />}
            {period === 'yearly' && <input type="number" min="2000" max="2100" aria-label="Tahun laporan" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="financial-report-year-input rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />}
            {period === 'range' && <div className="financial-report-range flex items-center gap-2"><input type="date" aria-label="Tanggal awal laporan" value={rangeStart} max={rangeEnd} onChange={(event) => setRangeStart(event.target.value || rangeStart)} className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" /><span className="text-xs text-gray-400">sampai</span><input type="date" aria-label="Tanggal akhir laporan" value={rangeEnd} min={rangeStart} onChange={(event) => setRangeEnd(event.target.value || rangeEnd)} className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" /></div>}
            <button type="button" onClick={() => onDownloadCsv(transactions, periodKey)} disabled={transactions.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
              <FileSpreadsheet className="h-4 w-4" /> {t('report.csv')}
            </button>
            <button type="button" onClick={() => window.print()} disabled={transactions.length === 0 && budgetRows.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Printer className="h-4 w-4" /> {t('report.pdf')}
            </button>
            <button type="button" onClick={onClose} className="financial-report-close rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Tutup preview laporan"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="financial-report-scroll min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          <article className="financial-report-document mx-auto w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-sm">
            <header className="financial-report-brand flex items-start justify-between gap-4 bg-blue-600 px-5 py-6 text-white sm:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><WalletCards className="h-6 w-6" /></div>
                <div><p className="text-xl font-bold">FinTrack</p><p className="text-xs text-blue-100">Personal wealth manager</p></div>
              </div>
              <div className="text-right"><p className="text-sm font-semibold">{isEnglish ? 'Financial Report' : 'Laporan Keuangan'}</p><p className="mt-1 text-xs text-blue-100">{reportPeriod}</p></div>
            </header>

            <div className="p-5 sm:p-8">
              <div className="mb-6 flex flex-col gap-1 border-b border-gray-200 pb-4 text-xs text-gray-500 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="font-medium text-gray-800">{isEnglish ? 'Transaction summary' : 'Ringkasan transaksi'}</p><p>{transactions.length} {isEnglish ? 'transactions recorded' : 'transaksi tercatat'}</p></div>
                <p>{isEnglish ? 'Generated' : 'Dibuat'} {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}</p>
              </div>

              <div className="financial-report-summary grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div><p>{isEnglish ? 'Income' : 'Pemasukan'}</p><strong className="text-green-600">{formatCurrency(summary.income)}</strong></div>
                <div><p>{isEnglish ? 'Expenses' : 'Pengeluaran'}</p><strong className="text-red-600">{formatCurrency(summary.expense)}</strong></div>
                <div><p>{isEnglish ? 'Net balance' : 'Saldo bersih'}</p><strong className={summary.balance < 0 ? 'text-red-600' : 'text-gray-900'}>{formatCurrency(summary.balance)}</strong></div>
              </div>

              {summary.expense > 0 && <div className="financial-report-breakdown mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Pengeluaran per kategori</p>{expenseBreakdown.categories.map(([label, amount]) => <div key={label} className="flex items-center justify-between gap-3 py-1.5 text-xs"><span className="min-w-0 truncate text-gray-600">{label}</span><span className="shrink-0 font-medium tabular-nums text-gray-900">{formatCurrency(amount)}</span></div>)}</div>
                <div className="rounded-lg border border-gray-200 p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Penggunaan sumber saldo</p>{expenseBreakdown.sources.map(([label, amount]) => <div key={label} className="flex items-center justify-between gap-3 py-1.5 text-xs"><span className="min-w-0 truncate text-gray-600">{label}</span><span className="shrink-0 font-medium tabular-nums text-gray-900">{formatCurrency(amount)}</span></div>)}</div>
              </div>}

              {budgetRows.length > 0 && <section className="mt-7">
                <div className="mb-3"><h3 className="text-sm font-semibold text-gray-900">Ringkasan Budget</h3><p className="text-xs text-gray-500">Budget yang periodenya bersinggungan dengan laporan ini.</p></div>
                <div className="financial-report-budget-grid grid grid-cols-1 gap-2 sm:grid-cols-2">{budgetRows.map((budget) => <div key={budget.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-semibold text-gray-900">{budget.category}</p><p className="text-[11px] text-gray-500">{budgetPeriodLabels[budget.period]} · {fundSourceLabels[budget.fundSource] || budget.fundSource}</p></div><span className={`shrink-0 text-xs font-semibold ${budget.remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>{Math.round(budget.percentage)}%</span></div>
                  <div className="my-2 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className={`h-full rounded-full ${budget.remaining < 0 ? 'bg-red-500' : budget.percentage >= 80 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(budget.percentage, 100)}%` }} /></div>
                  <div className="flex justify-between gap-2 text-[11px] text-gray-500"><span>Terpakai {formatCurrency(budget.spent)}</span><span>dari {formatCurrency(budget.amount)}</span></div>
                </div>)}</div>
              </section>}

              {transactions.length > 0 ? (
                <>
                  <div className="financial-report-table mt-7 overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead><tr><th>Tanggal</th><th>Merchant / Sumber</th><th>Kategori</th><th>Metode</th><th className="text-right">Nominal</th></tr></thead>
                      <tbody>{transactions.map((transaction) => <tr key={transaction.id}>
                        <td>{formatDate(transaction.date, locale)}</td>
                        <td><span className="font-medium text-gray-900">{transaction.merchant || '-'}</span><small>{fundSourceLabels[transaction.fundSource] || transaction.fundSource}</small></td>
                        <td>{transaction.category}</td><td>{transaction.paymentMethod}</td>
                        <td className={`text-right font-semibold ${transaction.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>{transaction.transactionType === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                  <div className="financial-report-mobile mt-6 space-y-2">{transactions.map((transaction) => <div key={transaction.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium text-gray-900">{transaction.merchant || '-'}</p><p className="text-xs text-gray-500">{formatDate(transaction.date, locale)} · {transaction.category}</p></div><p className={`shrink-0 text-sm font-semibold ${transaction.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>{transaction.transactionType === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</p></div>
                    <p className="mt-2 text-xs text-gray-500">{transaction.paymentMethod} · {fundSourceLabels[transaction.fundSource] || transaction.fundSource}</p>
                  </div>)}</div>
                </>
              ) : <div className="py-14 text-center"><Download className="mx-auto h-8 w-8 text-gray-300" /><p className="mt-3 font-medium text-gray-700">Tidak ada transaksi untuk ditampilkan</p><p className="mt-1 text-sm text-gray-500">Ubah cakupan laporan atau filter transaksi Anda.</p></div>}

              <footer className="mt-8 border-t border-gray-200 pt-4 text-center text-[11px] text-gray-400">Laporan ini dibuat secara otomatis oleh FinTrack berdasarkan data akun Anda.</footer>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
