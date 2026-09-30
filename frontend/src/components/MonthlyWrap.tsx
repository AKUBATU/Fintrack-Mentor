import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, ChartPie, CircleDollarSign, ReceiptText, Sparkles, Target, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { Budget, Dividend, ExpenseTransaction, StockTransaction } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/formatters';

interface MonthlyWrapProps {
  monthKey: string;
  userName?: string;
  expenses: ExpenseTransaction[];
  budgets: Budget[];
  stockTransactions: StockTransaction[];
  dividends: Dividend[];
  onClose: () => void;
  onOpenReport: () => void;
}

interface WrapSlide { key: string; eyebrow: string; title: string; icon: typeof Sparkles; content: ReactNode; tone: string }

export default function MonthlyWrap({ monthKey, userName, expenses, budgets, stockTransactions, dividends, onClose, onOpenReport }: MonthlyWrapProps) {
  const { locale, pick } = useLanguage();
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  const monthLabel = new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const data = useMemo(() => {
    const transactions = expenses.filter((item) => item.date.startsWith(monthKey));
    const outgoing = transactions.filter((item) => item.transactionType === 'expense');
    const income = transactions.filter((item) => item.transactionType === 'income').reduce((sum, item) => sum + item.amount, 0);
    const spending = outgoing.reduce((sum, item) => sum + item.amount, 0);
    const group = (key: 'category' | 'merchant') => Array.from(outgoing.reduce((map, item) => {
      const label = item[key]?.trim();
      if (label) map.set(label, (map.get(label) || 0) + item.amount);
      return map;
    }, new Map<string, number>())).sort((a, b) => b[1] - a[1]);
    const monthlyBudgets = budgets.filter((item) => item.period === 'monthly' && item.referenceDate.startsWith(monthKey));
    const budgetResults = monthlyBudgets.map((budget) => {
      const spent = outgoing.filter((item) => (budget.category === 'Keseluruhan' || item.category === budget.category)
        && (budget.fundSource === 'all' || item.fundSource === budget.fundSource)).reduce((sum, item) => sum + item.amount, 0);
      return { ...budget, spent, percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0 };
    });
    return {
      transactions,
      outgoing,
      income,
      spending,
      balance: income - spending,
      categories: group('category'),
      merchants: group('merchant'),
      largest: [...outgoing].sort((a, b) => b.amount - a.amount)[0],
      budgetResults,
      stockActivity: stockTransactions.filter((item) => item.date.startsWith(monthKey)),
      dividendActivity: dividends.filter((item) => item.paymentDate.startsWith(monthKey)),
    };
  }, [budgets, dividends, expenses, monthKey, stockTransactions]);

  const slides = useMemo<WrapSlide[]>(() => {
    const result: WrapSlide[] = [{
      key: 'intro', eyebrow: pick('MONTHLY WRAP', 'MONTHLY WRAP'), title: pick(`Cerita finansialmu di ${monthLabel}`, `Your financial story in ${monthLabel}`), icon: Sparkles, tone: 'monthly-wrap-tone-blue',
      content: <div className="monthly-wrap-intro"><p>{pick(`Hai ${userName?.split(' ')[0] || 'Anda'}, mari lihat kembali perjalanan keuangan bulan lalu.`, `Hi ${userName?.split(' ')[0] || 'there'}, let’s look back at your finances last month.`)}</p><strong>{data.transactions.length}</strong><span>{pick('transaksi tercatat', 'transactions recorded')}</span></div>,
    }, {
      key: 'cashflow', eyebrow: pick('ARUS KAS', 'CASH FLOW'), title: pick('Uang masuk dan keluar', 'Money in and out'), icon: data.balance >= 0 ? TrendingUp : TrendingDown, tone: data.balance >= 0 ? 'monthly-wrap-tone-green' : 'monthly-wrap-tone-red',
      content: <div className="monthly-wrap-metrics"><div><span>{pick('Pemasukan', 'Income')}</span><strong className="text-green-600">{formatCurrency(data.income)}</strong></div><div><span>{pick('Pengeluaran', 'Expenses')}</span><strong className="text-red-600">{formatCurrency(data.spending)}</strong></div><div className="monthly-wrap-metric-wide"><span>{pick('Arus kas bersih', 'Net cash flow')}</span><strong className={data.balance >= 0 ? 'text-green-600' : 'text-red-600'}>{data.balance >= 0 ? '+' : ''}{formatCurrency(data.balance)}</strong></div></div>,
    }];
    if (data.outgoing.length) result.push({
      key: 'spending', eyebrow: pick('POLA PENGELUARAN', 'SPENDING PATTERN'), title: pick('Ke mana uangmu pergi?', 'Where did your money go?'), icon: ChartPie, tone: 'monthly-wrap-tone-amber',
      content: <div className="monthly-wrap-facts"><div><span>{pick('Kategori terbesar', 'Top category')}</span><strong>{data.categories[0]?.[0] || '-'}</strong><small>{formatCurrency(data.categories[0]?.[1] || 0)}</small></div><div><span>{pick('Merchant terbesar', 'Top merchant')}</span><strong>{data.merchants[0]?.[0] || '-'}</strong><small>{formatCurrency(data.merchants[0]?.[1] || 0)}</small></div><div><span>{pick('Transaksi terbesar', 'Largest transaction')}</span><strong>{data.largest?.merchant || data.largest?.category || '-'}</strong><small>{formatCurrency(data.largest?.amount || 0)}</small></div></div>,
    });
    if (data.budgetResults.length) result.push({
      key: 'budget', eyebrow: 'BUDGET', title: pick('Bagaimana performa budgetmu?', 'How did your budgets perform?'), icon: Target, tone: 'monthly-wrap-tone-violet',
      content: <div className="monthly-wrap-budget"><strong>{data.budgetResults.filter((item) => item.percentage <= 100).length} / {data.budgetResults.length}</strong><p>{pick('budget tetap berada di dalam batas', 'budgets stayed within their limits')}</p><div>{data.budgetResults.slice(0, 3).map((item) => <span key={item.id}>{item.category}<b className={item.percentage > 100 ? 'text-red-600' : 'text-green-600'}>{Math.round(item.percentage)}%</b></span>)}</div></div>,
    });
    if (data.stockActivity.length || data.dividendActivity.length) result.push({
      key: 'investing', eyebrow: pick('AKTIVITAS INVESTASI', 'INVESTMENT ACTIVITY'), title: pick('Investasimu bulan lalu', 'Your investments last month'), icon: CircleDollarSign, tone: 'monthly-wrap-tone-green',
      content: <div className="monthly-wrap-metrics"><div><span>{pick('Transaksi saham', 'Stock transactions')}</span><strong>{data.stockActivity.length}</strong></div><div><span>{pick('Pembayaran dividen', 'Dividend payments')}</span><strong>{data.dividendActivity.length}</strong></div><div className="monthly-wrap-metric-wide"><span>{pick('Total dividen', 'Total dividends')}</span><strong className="text-green-600">{formatCurrency(data.dividendActivity.reduce((sum, item) => sum + item.amount, 0))}</strong></div></div>,
    });
    result.push({
      key: 'finish', eyebrow: pick('SELESAI', 'THAT’S A WRAP'), title: pick(`${monthLabel} sudah dirangkum`, `${monthLabel} is all wrapped up`), icon: ReceiptText, tone: 'monthly-wrap-tone-blue',
      content: <div className="monthly-wrap-finish"><p>{pick('Lihat laporan lengkap untuk memeriksa transaksi, kategori, sumber saldo, dan budget secara rinci.', 'Open the full report to review transactions, categories, fund sources, and budgets in detail.')}</p><button type="button" onClick={onOpenReport}><CalendarDays className="h-4 w-4" />{pick('Lihat laporan lengkap', 'View full report')}</button></div>,
    });
    return result;
  }, [data, monthLabel, onOpenReport, pick, userName]);

  const go = (next: number) => setActive(Math.max(0, Math.min(slides.length - 1, next)));
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') go(active - 1);
      if (event.key === 'ArrowRight') active === slides.length - 1 ? onClose() : go(active + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', handleKey); };
  }, [active, onClose, slides.length]);

  const slide = slides[active];
  const Icon = slide.icon;
  return <div className="monthly-wrap-overlay fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="monthly-wrap-title">
    <section className={`monthly-wrap-modal ${slide.tone}`} onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => { if (touchStart.current === null) return; const delta = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(delta) > 55) go(active + (delta < 0 ? 1 : -1)); touchStart.current = null; }}>
      <div className="monthly-wrap-progress" aria-label={`${active + 1} / ${slides.length}`}>{slides.map((item, index) => <span key={item.key} className={index <= active ? 'is-active' : ''} />)}</div>
      <button type="button" onClick={onClose} className="monthly-wrap-close" aria-label={pick('Tutup Monthly Wrap', 'Close Monthly Wrap')}><X className="h-5 w-5" /></button>
      <div className="monthly-wrap-body" key={slide.key}>
        <div className="monthly-wrap-icon"><Icon className="h-6 w-6" /></div><p className="monthly-wrap-eyebrow">{slide.eyebrow}</p><h2 id="monthly-wrap-title">{slide.title}</h2>{slide.content}
      </div>
      <footer className="monthly-wrap-nav"><button type="button" onClick={() => go(active - 1)} disabled={active === 0}><ArrowLeft className="h-4 w-4" />{pick('Sebelumnya', 'Previous')}</button><span>{active + 1} / {slides.length}</span><button type="button" onClick={() => active === slides.length - 1 ? onClose() : go(active + 1)}>{active === slides.length - 1 ? pick('Selesai', 'Done') : pick('Berikutnya', 'Next')}{active < slides.length - 1 && <ArrowRight className="h-4 w-4" />}</button></footer>
    </section>
  </div>;
}
