import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer, WalletCards, X } from 'lucide-react';
import type { ExpenseTransaction } from '../contexts/DataContext';
import { formatCurrency } from '../utils/formatters';

interface FinancialReportPreviewProps {
  allTransactions: ExpenseTransaction[];
  initialDate: string;
  fundSourceLabels: Record<string, string>;
  onClose: () => void;
  onDownloadCsv: (transactions: ExpenseTransaction[], periodKey: string) => void;
}

type ReportPeriod = 'daily' | 'monthly' | 'range' | 'yearly' | 'all';

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default function FinancialReportPreview({
  allTransactions,
  initialDate,
  fundSourceLabels,
  onClose,
  onDownloadCsv,
}: FinancialReportPreviewProps) {
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
    if (period === 'daily') return formatDate(selectedDate);
    if (period === 'monthly') return new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    if (period === 'yearly') return `Tahun ${selectedYear}`;
    if (period === 'range') return `${formatDate(rangeStart)} – ${formatDate(rangeEnd)}`;
    if (transactions.length === 0) return 'Semua data';
    const dates = transactions.map((transaction) => transaction.date).sort();
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    return firstDate === lastDate ? formatDate(firstDate) : `${formatDate(firstDate)} – ${formatDate(lastDate)}`;
  }, [period, rangeEnd, rangeStart, selectedDate, selectedMonth, selectedYear, transactions]);

  const periodKey = period === 'daily' ? selectedDate
    : period === 'monthly' ? selectedMonth
      : period === 'yearly' ? selectedYear
        : period === 'range' ? `${rangeStart}_${rangeEnd}` : 'semua';

  return (
    <div className="financial-report-overlay fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="financial-report-title">
      <div className="financial-report-modal flex h-full w-full flex-col overflow-hidden bg-gray-100 sm:h-auto sm:max-h-[94dvh] sm:max-w-5xl sm:rounded-xl">
        <div className="financial-report-toolbar flex shrink-0 flex-col gap-3 border-b border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 id="financial-report-title" className="font-semibold text-gray-900">Preview Laporan Keuangan</h2>
            <p className="text-xs text-gray-500">Periksa dokumen sebelum menyimpan atau mengunduhnya.</p>
          </div>
          <div className="financial-report-actions flex flex-wrap items-center gap-2">
            <select value={period} onChange={(event) => setPeriod(event.target.value as ReportPeriod)} aria-label="Pilih periode laporan" className="financial-report-period min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm sm:flex-none">
              <option value="daily">Harian</option>
              <option value="monthly">Bulanan</option>
              <option value="range">Rentang tanggal</option>
              <option value="yearly">Tahunan</option>
              <option value="all">Semua data</option>
            </select>
            {period === 'daily' && <input type="date" aria-label="Tanggal laporan" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value || initialDate)} className="financial-report-period-input rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />}
            {period === 'monthly' && <input type="month" aria-label="Bulan laporan" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value || initialMonth)} className="financial-report-period-input rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />}
            {period === 'yearly' && <input type="number" min="2000" max="2100" aria-label="Tahun laporan" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="financial-report-year-input rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />}
            {period === 'range' && <div className="financial-report-range flex items-center gap-2"><input type="date" aria-label="Tanggal awal laporan" value={rangeStart} max={rangeEnd} onChange={(event) => setRangeStart(event.target.value || rangeStart)} className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" /><span className="text-xs text-gray-400">sampai</span><input type="date" aria-label="Tanggal akhir laporan" value={rangeEnd} min={rangeStart} onChange={(event) => setRangeEnd(event.target.value || rangeEnd)} className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" /></div>}
            <button type="button" onClick={() => onDownloadCsv(transactions, periodKey)} disabled={transactions.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </button>
            <button type="button" onClick={() => window.print()} disabled={transactions.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Printer className="h-4 w-4" /> Simpan PDF
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Tutup preview laporan"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="financial-report-scroll min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          <article className="financial-report-document mx-auto w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-sm">
            <header className="financial-report-brand flex items-start justify-between gap-4 bg-blue-600 px-5 py-6 text-white sm:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><WalletCards className="h-6 w-6" /></div>
                <div><p className="text-xl font-bold">FinTrack</p><p className="text-xs text-blue-100">Personal wealth manager</p></div>
              </div>
              <div className="text-right"><p className="text-sm font-semibold">Laporan Keuangan</p><p className="mt-1 text-xs text-blue-100">{reportPeriod}</p></div>
            </header>

            <div className="p-5 sm:p-8">
              <div className="mb-6 flex flex-col gap-1 border-b border-gray-200 pb-4 text-xs text-gray-500 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="font-medium text-gray-800">Ringkasan transaksi</p><p>{transactions.length} transaksi tercatat</p></div>
                <p>Dibuat {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}</p>
              </div>

              <div className="financial-report-summary grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div><p>Pemasukan</p><strong className="text-green-600">{formatCurrency(summary.income)}</strong></div>
                <div><p>Pengeluaran</p><strong className="text-red-600">{formatCurrency(summary.expense)}</strong></div>
                <div><p>Saldo bersih</p><strong className={summary.balance < 0 ? 'text-red-600' : 'text-gray-900'}>{formatCurrency(summary.balance)}</strong></div>
              </div>

              {summary.expense > 0 && <div className="financial-report-breakdown mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Pengeluaran per kategori</p>{expenseBreakdown.categories.map(([label, amount]) => <div key={label} className="flex items-center justify-between gap-3 py-1.5 text-xs"><span className="min-w-0 truncate text-gray-600">{label}</span><span className="shrink-0 font-medium tabular-nums text-gray-900">{formatCurrency(amount)}</span></div>)}</div>
                <div className="rounded-lg border border-gray-200 p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Penggunaan sumber saldo</p>{expenseBreakdown.sources.map(([label, amount]) => <div key={label} className="flex items-center justify-between gap-3 py-1.5 text-xs"><span className="min-w-0 truncate text-gray-600">{label}</span><span className="shrink-0 font-medium tabular-nums text-gray-900">{formatCurrency(amount)}</span></div>)}</div>
              </div>}

              {transactions.length > 0 ? (
                <>
                  <div className="financial-report-table mt-7 overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead><tr><th>Tanggal</th><th>Merchant / Sumber</th><th>Kategori</th><th>Metode</th><th className="text-right">Nominal</th></tr></thead>
                      <tbody>{transactions.map((transaction) => <tr key={transaction.id}>
                        <td>{formatDate(transaction.date)}</td>
                        <td><span className="font-medium text-gray-900">{transaction.merchant || '-'}</span><small>{fundSourceLabels[transaction.fundSource] || transaction.fundSource}</small></td>
                        <td>{transaction.category}</td><td>{transaction.paymentMethod}</td>
                        <td className={`text-right font-semibold ${transaction.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>{transaction.transactionType === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                  <div className="financial-report-mobile mt-6 space-y-2">{transactions.map((transaction) => <div key={transaction.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium text-gray-900">{transaction.merchant || '-'}</p><p className="text-xs text-gray-500">{formatDate(transaction.date)} · {transaction.category}</p></div><p className={`shrink-0 text-sm font-semibold ${transaction.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>{transaction.transactionType === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</p></div>
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
