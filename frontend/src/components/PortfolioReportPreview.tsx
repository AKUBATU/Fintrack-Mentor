import { useMemo, useState } from 'react';
import { FileSpreadsheet, PieChart, Printer, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';

export interface PortfolioReportAsset {
  id: string;
  name: string;
  symbol?: string;
  type: string;
  ownership: string;
  cost: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

export interface PortfolioReportTransaction {
  id: string;
  ticker: string;
  type: 'BELI' | 'JUAL';
  date: string;
  ownership: string;
  price: number;
  total: number;
}

export interface PortfolioReportDividend { id: string; ticker: string; date: string; amount: number; }
export interface PortfolioReportMetrics { totalValue: number; totalCost: number; unrealizedPL: number; realizedPL: number; totalDividends: number; }

interface Props {
  assets: PortfolioReportAsset[];
  transactions: PortfolioReportTransaction[];
  dividends: PortfolioReportDividend[];
  metrics: PortfolioReportMetrics;
  initialDate: string;
  onClose: () => void;
}

type ActivityPeriod = 'monthly' | 'yearly' | 'all';
type ReportDetail = 'summary' | 'detailed';
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const formatDate = (value: string, locale: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export default function PortfolioReportPreview({ assets, transactions, dividends, metrics, initialDate, onClose }: Props) {
  const { language, locale, t } = useLanguage();
  const isEnglish = language === 'en';
  const initialMonth = initialDate.slice(0, 7);
  const [period, setPeriod] = useState<ActivityPeriod>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialDate.slice(0, 4));
  const [detail, setDetail] = useState<ReportDetail>('summary');
  const periodPrefix = period === 'monthly' ? selectedMonth : period === 'yearly' ? selectedYear : '';
  const filteredTransactions = useMemo(() => transactions.filter((item) => period === 'all' || item.date.startsWith(periodPrefix)), [period, periodPrefix, transactions]);
  const filteredDividends = useMemo(() => dividends.filter((item) => period === 'all' || item.date.startsWith(periodPrefix)), [dividends, period, periodPrefix]);
  const activityLabel = period === 'monthly'
    ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    : period === 'yearly' ? `${isEnglish ? 'Year' : 'Tahun'} ${selectedYear}` : (isEnglish ? 'All periods' : 'Seluruh periode');

  const transactionSummary = useMemo(() => {
    const grouped = new Map<string, { ticker: string; buyCount: number; sellCount: number; buyValue: number; sellValue: number }>();
    filteredTransactions.forEach((item) => {
      const row = grouped.get(item.ticker) || { ticker: item.ticker, buyCount: 0, sellCount: 0, buyValue: 0, sellValue: 0 };
      if (item.type === 'BELI') { row.buyCount += 1; row.buyValue += item.total; }
      else { row.sellCount += 1; row.sellValue += item.total; }
      grouped.set(item.ticker, row);
    });
    return Array.from(grouped.values()).sort((a, b) => (b.buyValue + b.sellValue) - (a.buyValue + a.sellValue));
  }, [filteredTransactions]);

  const dividendSummary = useMemo(() => {
    const grouped = new Map<string, { ticker: string; payments: number; amount: number }>();
    filteredDividends.forEach((item) => {
      const row = grouped.get(item.ticker) || { ticker: item.ticker, payments: 0, amount: 0 };
      row.payments += 1; row.amount += item.amount; grouped.set(item.ticker, row);
    });
    return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount);
  }, [filteredDividends]);

  const downloadCsv = () => {
    const lines = [
      ['RINGKASAN PORTOFOLIO'],
      ['Nilai terkini', metrics.totalValue], ['Total modal', metrics.totalCost], ['Unrealized P/L', metrics.unrealizedPL], ['Realized P/L', metrics.realizedPL], ['Total dividen', metrics.totalDividends],
      [], ['ASET AKTIF'], ['Nama', 'Simbol', 'Jenis', 'Kepemilikan', 'Modal (IDR)', 'Nilai terkini (IDR)', 'P/L (IDR)', 'P/L (%)'],
      ...assets.map((asset) => [asset.name, asset.symbol || '', asset.type, asset.ownership, asset.cost, asset.currentValue, asset.profitLoss, asset.profitLossPercent]),
      [], [`TRANSAKSI SAHAM — ${activityLabel}`], ['Tanggal', 'Ticker', 'Jenis', 'Kepemilikan', 'Harga/lembar', 'Total'],
      ...filteredTransactions.map((item) => [item.date, item.ticker, item.type, item.ownership, item.price, item.total]),
      [], [`DIVIDEN — ${activityLabel}`], ['Tanggal', 'Ticker', 'Jumlah'],
      ...filteredDividends.map((item) => [item.date, item.ticker, item.amount]),
    ];
    const blob = new Blob([lines.map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `fintrack-portofolio-${period === 'all' ? 'semua' : periodPrefix}.csv`; anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  };

  return <div className="portfolio-form-overlay financial-report-overlay fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="portfolio-report-title">
    <div className="financial-report-modal flex h-full w-full flex-col overflow-hidden bg-gray-100 sm:h-auto sm:max-h-[94dvh] sm:max-w-6xl sm:rounded-xl">
      <div className="financial-report-toolbar portfolio-report-toolbar shrink-0 border-b border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><h2 id="portfolio-report-title" className="font-semibold text-gray-900">{t('report.previewPortfolio')}</h2><p className="text-xs text-gray-500">{isEnglish ? 'Valuation uses current prices. The period only filters investment activity.' : 'Valuasi memakai harga terkini. Periode hanya menyaring aktivitas investasi.'}</p></div>
          <button type="button" onClick={onClose} className="financial-report-close shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Tutup preview laporan"><X className="h-5 w-5" /></button>
        </div>
        <div className="portfolio-report-controlbar mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <div className="portfolio-report-period-controls flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-gray-500">{isEnglish ? 'Activity' : 'Aktivitas'}</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value as ActivityPeriod)} className="financial-report-period min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"><option value="monthly">{t('report.monthly')}</option><option value="yearly">{t('report.yearly')}</option><option value="all">{isEnglish ? 'All activity' : 'Semua aktivitas'}</option></select>
            {period === 'monthly' && <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value || initialMonth)} className="financial-report-period-input rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" aria-label="Bulan aktivitas portfolio" />}
            {period === 'yearly' && <input type="number" min="2000" max="2100" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="financial-report-year-input rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" aria-label="Tahun aktivitas portfolio" />}
            <div className="portfolio-report-detail-toggle grid grid-cols-2 rounded-lg border border-gray-200 bg-gray-100 p-0.5">
              <button type="button" onClick={() => setDetail('summary')} className={detail === 'summary' ? 'active' : ''}>{t('report.summary')}</button>
              <button type="button" onClick={() => setDetail('detailed')} className={detail === 'detailed' ? 'active' : ''}>{t('report.detailed')}</button>
            </div>
          </div>
          <div className="portfolio-report-downloads flex shrink-0 items-center gap-2">
            <button type="button" onClick={downloadCsv} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700"><FileSpreadsheet className="h-4 w-4" /> {t('report.csv')}</button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"><Printer className="h-4 w-4" /> {t('report.pdf')}</button>
          </div>
        </div>
      </div>

      <div className="financial-report-scroll min-h-0 flex-1 overflow-y-auto p-3 sm:p-6"><article className="financial-report-document mx-auto w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-sm">
        <header className="financial-report-brand flex items-start justify-between gap-4 bg-blue-600 px-5 py-6 text-white sm:px-8"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><PieChart className="h-6 w-6" /></div><div><p className="text-xl font-bold">FinTrack</p><p className="text-xs text-blue-100">Personal wealth manager</p></div></div><div className="text-right"><p className="text-sm font-semibold">{isEnglish ? 'Portfolio Report' : 'Laporan Portfolio'}</p><p className="mt-1 text-xs text-blue-100">{isEnglish ? 'Activity' : 'Aktivitas'} {activityLabel}</p></div></header>
        <div className="p-5 sm:p-8">
          <div className="mb-6 flex flex-col gap-1 border-b border-gray-200 pb-4 text-xs text-gray-500 sm:flex-row sm:justify-between"><div><p className="font-medium text-gray-800">{isEnglish ? 'Current portfolio snapshot' : 'Snapshot portfolio terkini'}</p><p>{assets.length} {isEnglish ? 'active assets' : 'aset aktif'}</p></div><p>{isEnglish ? 'Generated' : 'Dibuat'} {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}</p></div>
          <div className="portfolio-report-summary grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p>Nilai terkini</p><strong>{formatCurrency(metrics.totalValue)}</strong></div><div><p>Total modal</p><strong>{formatCurrency(metrics.totalCost)}</strong></div><div><p>Unrealized P/L</p><strong className={metrics.unrealizedPL < 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(metrics.unrealizedPL)}</strong></div><div><p>Total dividen · sepanjang waktu</p><strong className="text-green-600">{formatCurrency(metrics.totalDividends)}</strong></div></div>
          <p className="mt-3 text-[11px] text-gray-500">Realized P/L dari transaksi jual: <span className={metrics.realizedPL < 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(metrics.realizedPL)}</span></p>

          <section className="mt-7"><div className="mb-3"><h3 className="text-sm font-semibold text-gray-900">Aset aktif</h3><p className="text-xs text-gray-500">Nilai berdasarkan harga terakhir yang tersimpan di FinTrack.</p></div>
            {assets.length ? <><div className="financial-report-table overflow-hidden rounded-lg border border-gray-200"><table className="w-full border-collapse text-left text-xs"><thead><tr><th>Aset</th><th>Jenis</th><th>Kepemilikan</th><th className="text-right">Modal</th><th className="text-right">Nilai kini</th><th className="text-right">P/L</th></tr></thead><tbody>{assets.map((asset) => <tr key={asset.id}><td><span className="font-medium text-gray-900">{asset.name}</span>{asset.symbol && <small>{asset.symbol}</small>}</td><td>{asset.type}</td><td>{asset.ownership}</td><td className="text-right">{formatCurrency(asset.cost)}</td><td className="text-right font-medium">{formatCurrency(asset.currentValue)}</td><td className={`text-right font-semibold ${asset.profitLoss < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(asset.profitLoss)}<small>{asset.profitLossPercent.toFixed(2)}%</small></td></tr>)}</tbody></table></div>
            <div className="financial-report-mobile space-y-2">{assets.map((asset) => <div key={asset.id} className="rounded-lg border border-gray-200 p-3"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium text-gray-900">{asset.name}</p><p className="text-xs text-gray-500">{asset.symbol ? `${asset.symbol} · ` : ''}{asset.type}</p></div><p className="shrink-0 text-sm font-semibold text-gray-900">{formatCurrency(asset.currentValue)}</p></div><div className="mt-2 flex justify-between gap-3 text-xs text-gray-500"><span>{asset.ownership}</span><span className={asset.profitLoss < 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(asset.profitLoss)}</span></div></div>)}</div></> : <p className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">Belum ada aset aktif.</p>}
          </section>

          <div className={`portfolio-report-activity mt-7 space-y-7 ${detail === 'detailed' ? 'portfolio-report-appendix' : ''}`}>
            <section><h3 className="text-sm font-semibold text-gray-900">Transaksi saham</h3><p className="mb-3 text-xs text-gray-500">Aktivitas {activityLabel} · {filteredTransactions.length} transaksi · {transactionSummary.length} ticker</p>
              {filteredTransactions.length ? <div className="financial-report-table portfolio-report-activity-table overflow-hidden rounded-lg border border-gray-200"><table className="w-full border-collapse text-left text-xs"><thead><tr>{detail === 'summary' ? <><th>Ticker</th><th className="text-right">Beli</th><th className="text-right">Nilai beli</th><th className="text-right">Jual</th><th className="text-right">Nilai jual</th></> : <><th>Tanggal</th><th>Ticker</th><th>Jenis</th><th>Kepemilikan</th><th className="text-right">Harga</th><th className="text-right">Total</th></>}</tr></thead>
                <tbody>{detail === 'summary' ? transactionSummary.map((item) => <tr key={item.ticker}><td data-label="Ticker" className="font-semibold text-gray-900">{item.ticker}</td><td data-label="Beli" className="text-right">{item.buyCount} transaksi</td><td data-label="Nilai beli" className="text-right">{formatCurrency(item.buyValue)}</td><td data-label="Jual" className="text-right">{item.sellCount} transaksi</td><td data-label="Nilai jual" className="text-right">{formatCurrency(item.sellValue)}</td></tr>) : filteredTransactions.map((item) => <tr key={item.id}><td data-label="Tanggal">{formatDate(item.date, locale)}</td><td data-label="Ticker" className="font-semibold text-gray-900">{item.ticker}</td><td data-label="Jenis"><span className={item.type === 'BELI' ? 'text-green-600' : 'text-red-600'}>{item.type}</span></td><td data-label="Kepemilikan">{item.ownership}</td><td data-label="Harga" className="text-right">{formatCurrency(item.price)}</td><td data-label="Total" className="text-right font-medium text-gray-900">{formatCurrency(item.total)}</td></tr>)}</tbody></table></div> : <p className="text-xs text-gray-500">Tidak ada transaksi pada periode ini.</p>}
            </section>
            <section><h3 className="text-sm font-semibold text-gray-900">Dividen</h3><p className="mb-3 text-xs text-gray-500">Aktivitas {activityLabel} · {filteredDividends.length} pembayaran · {dividendSummary.length} ticker</p>
              {filteredDividends.length ? <div className="financial-report-table portfolio-report-activity-table overflow-hidden rounded-lg border border-gray-200"><table className="w-full border-collapse text-left text-xs"><thead><tr>{detail === 'summary' ? <><th>Ticker</th><th className="text-right">Pembayaran</th><th className="text-right">Total dividen</th></> : <><th>Tanggal</th><th>Ticker</th><th className="text-right">Jumlah</th></>}</tr></thead><tbody>{detail === 'summary' ? dividendSummary.map((item) => <tr key={item.ticker}><td data-label="Ticker" className="font-semibold text-gray-900">{item.ticker}</td><td data-label="Pembayaran" className="text-right">{item.payments} kali</td><td data-label="Total dividen" className="text-right font-semibold text-green-600">{formatCurrency(item.amount)}</td></tr>) : filteredDividends.map((item) => <tr key={item.id}><td data-label="Tanggal">{formatDate(item.date, locale)}</td><td data-label="Ticker" className="font-semibold text-gray-900">{item.ticker}</td><td data-label="Jumlah" className="text-right font-semibold text-green-600">{formatCurrency(item.amount)}</td></tr>)}</tbody></table></div> : <p className="text-xs text-gray-500">Tidak ada dividen pada periode ini.</p>}
            </section>
          </div>
          <footer className="mt-8 border-t border-gray-200 pt-4 text-center text-[11px] text-gray-400">Laporan dibuat otomatis berdasarkan data akun FinTrack. Nilai portfolio bukan nilai historis dan bukan rekomendasi investasi.</footer>
        </div>
      </article></div>
    </div>
  </div>;
}
