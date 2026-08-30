import { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, TrendingUp, TrendingDown, DollarSign, X, Pencil, Trash2, Activity, Layers3, Wallet, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const ASSET_TYPES = [
  ['stock', 'Saham'], ['etf', 'ETF'], ['money_market_fund', 'Reksa Dana Pasar Uang (RDPU)'], ['mutual_fund', 'Reksa Dana Lainnya'], ['bond', 'Obligasi'],
  ['deposit', 'Deposito'], ['cash', 'Kas'], ['crypto', 'Kripto'], ['gold', 'Emas'],
  ['commodity', 'Komoditas'], ['property', 'Properti'], ['business', 'Bisnis'],
  ['private_equity', 'Private Equity'], ['p2p', 'P2P Lending'], ['pension', 'Dana Pensiun'],
  ['insurance_investment', 'Asuransi Investasi'], ['collectible', 'Koleksi'],
  ['forex', 'Forex'], ['derivative', 'Derivatif'], ['other', 'Lainnya'],
] as const;

const assetTypeLabel = (type: string) => ASSET_TYPES.find(([value]) => value === type)?.[1] || type;

const compactAssetTypeLabel = (type: string) => type === 'money_market_fund' ? 'RDPU' : type === 'mutual_fund' ? 'Reksa Dana' : assetTypeLabel(type);

const ALLOCATION_COLORS = ['#2563eb', '#0f766e', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#64748b'];

const CURRENCY_CODES = ['IDR', 'USD', 'EUR'] as const;

const DIRECT_VALUE_ASSETS = new Set([
  'money_market_fund', 'deposit', 'cash', 'property', 'business', 'private_equity', 'p2p', 'pension',
  'insurance_investment', 'collectible', 'other',
]);

const ASSET_FIELD_LABELS: Record<string, { quantity: string; buy: string; current: string; hint: string }> = {
  stock: { quantity: 'Jumlah Lembar', buy: 'Harga Beli / Lembar', current: 'Harga Saat Ini / Lembar', hint: 'Masukkan jumlah lembar saham.' },
  etf: { quantity: 'Jumlah Unit ETF', buy: 'Harga Beli / Unit', current: 'Harga Saat Ini / Unit', hint: 'Masukkan unit ETF yang dimiliki.' },
  money_market_fund: { quantity: 'Jumlah Unit', buy: 'Nilai Investasi Awal', current: 'Nilai Investasi Saat Ini', hint: 'Masukkan total nominal RDPU yang terlihat di aplikasi investasi.' },
  mutual_fund: { quantity: 'Unit Penyertaan', buy: 'NAB Beli / Unit', current: 'NAB Saat Ini / Unit', hint: 'Gunakan jumlah unit penyertaan dan NAB per unit.' },
  crypto: { quantity: 'Jumlah Koin / Token', buy: 'Harga Beli / Koin', current: 'Harga Saat Ini / Koin', hint: 'Jumlah boleh berupa pecahan, misalnya 0,025.' },
  gold: { quantity: 'Berat (gram)', buy: 'Harga Beli / Gram', current: 'Harga Saat Ini / Gram', hint: 'Masukkan berat emas dalam gram.' },
  bond: { quantity: 'Jumlah Unit Obligasi', buy: 'Harga Beli / Unit', current: 'Harga Saat Ini / Unit', hint: 'Masukkan unit obligasi yang dimiliki.' },
  forex: { quantity: 'Jumlah Mata Uang', buy: 'Kurs Beli / Unit', current: 'Kurs Saat Ini / Unit', hint: 'Masukkan jumlah mata uang yang dimiliki.' },
  commodity: { quantity: 'Jumlah Unit Komoditas', buy: 'Harga Beli / Unit', current: 'Harga Saat Ini / Unit', hint: 'Gunakan satuan sesuai aset yang Anda catat.' },
  derivative: { quantity: 'Jumlah Kontrak', buy: 'Nilai Beli / Kontrak', current: 'Nilai Saat Ini / Kontrak', hint: 'Masukkan jumlah kontrak yang dimiliki.' },
};

const DEFAULT_ASSET_FIELDS = { quantity: 'Jumlah Unit', buy: 'Total Nilai Awal', current: 'Total Nilai Saat Ini', hint: 'Nilai aset dicatat langsung sebagai total nominal.' };

const assetQuantitySummary = (asset: any) => {
  if (DIRECT_VALUE_ASSETS.has(asset.asset_type)) return 'Dicatat sebagai total nilai';
  const unit = asset.asset_type === 'gold' ? 'gram' : asset.asset_type === 'crypto' ? 'koin/token' : asset.asset_type === 'derivative' ? 'kontrak' : 'unit';
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 8 }).format(asset.quantity)} ${unit}`;
};

const parseAssetAmount = (value: string, currency: string) => {
  if (currency === 'IDR') return Number(value.replace(/[^\d]/g, ''));
  return Number(value.replace(',', '.'));
};

const formatAssetAmount = (value: string, currency: string) => {
  if (currency !== 'IDR') return value;
  const digits = value.replace(/[^\d]/g, '');
  return digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '';
};

export default function Portfolio() {
  // ✅ ambil context apa adanya (tetap), tapi kita bikin aman kalau ada field yang belum disediakan
  const data: any = useData();

  const stockTransactions = (data?.stockTransactions ?? []) as any[];
  const holdings = (data?.holdings ?? []) as any[];
  const dividends = (data?.dividends ?? []) as any[];
  const dailyReports = (data?.dailyReports ?? []) as any[];

  const addStockTransaction = data?.addStockTransaction as undefined | ((payload: any) => Promise<void>);
  const updateStockTransaction = data?.updateStockTransaction as undefined | ((id: string, payload: any) => Promise<void>);
  const deleteStockTransaction = data?.deleteStockTransaction as undefined | ((id: string) => Promise<void>);
  const addDividend = data?.addDividend as undefined | ((payload: any) => Promise<void>);

  // ✅ ini yang bikin error kamu: kalau context belum punya, dia undefined → kita guard biar nggak crash
  const updateHoldingPrice =
    typeof data?.updateHoldingPrice === 'function' ? (data.updateHoldingPrice as (ticker: string, price: number) => void) : undefined;

  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddDividend, setShowAddDividend] = useState(false);
  const [showUpdatePrice, setShowUpdatePrice] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState('');
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [investmentAssets, setInvestmentAssets] = useState<any[]>([]);
  const [portfolioHealth, setPortfolioHealth] = useState<any>(null);
  const [assetLoading, setAssetLoading] = useState(true);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [savingAsset, setSavingAsset] = useState(false);
  const emptyAssetForm = {
    name: '', symbol: '', asset_type: 'mutual_fund', quantity: '1', average_price: '',
    current_price: '', currency: 'IDR', exchange_rate_to_idr: '1', acquired_date: '', notes: '',
  };
  const [assetForm, setAssetForm] = useState(emptyAssetForm);
  const assetFields = ASSET_FIELD_LABELS[assetForm.asset_type] || DEFAULT_ASSET_FIELDS;
  const usesDirectValue = DIRECT_VALUE_ASSETS.has(assetForm.asset_type);
  const portfolioAssetCount = holdings.length + investmentAssets.length;

  const [transactionForm, setTransactionForm] = useState({
    ticker: '',
    type: 'buy' as 'buy' | 'sell',
    date: new Date().toISOString().split('T')[0],
    lots: '',
    pricePerShare: '',
    fee: '' // UI tetap ada, tapi context/back-end kamu saat ini belum simpan fee
  });

  const [dividendForm, setDividendForm] = useState({
    ticker: '',
    dividendPerShare: '',
    shares: '',
    recordDate: '',
    paymentDate: ''
  });

  const [priceForm, setPriceForm] = useState({
    ticker: '',
    price: ''
  });

  const loadAssetsAndHealth = async () => {
    try {
      const [assets, health] = await Promise.all([api.listInvestmentAssets(), api.portfolioHealth()]);
      setInvestmentAssets(assets);
      setPortfolioHealth(health);
    } catch (error: any) {
      toast.error(error?.message || 'Data aset investasi gagal dimuat');
    } finally {
      setAssetLoading(false);
    }
  };

  useEffect(() => { void loadAssetsAndHealth(); }, []);

  // ======================
  // Helpers (biar cocok dengan schema DataContext kamu)
  // ======================
  const num = (v: any) => {
    const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : NaN;
  };

  const getTxUIType = (tx: any): 'buy' | 'sell' => {
    const t = String(tx?.type ?? '').toUpperCase();
    if (t === 'BUY') return 'buy';
    if (t === 'SELL') return 'sell';
    const low = String(tx?.type ?? '').toLowerCase();
    if (low === 'buy' || low === 'beli') return 'buy';
    if (low === 'sell' || low === 'jual') return 'sell';
    return 'buy';
  };

  const getTxLots = (tx: any): number => {
    const lots = num(tx?.lots);
    if (Number.isFinite(lots) && lots > 0) return lots;
    const shares = num(tx?.shares);
    if (Number.isFinite(shares) && shares > 0) return shares / 100;
    return 0;
  };

  const getTxShares = (tx: any): number => {
    const shares = num(tx?.shares);
    if (Number.isFinite(shares) && shares > 0) return shares;
    const lots = getTxLots(tx);
    return Math.round(lots * 100);
  };

  // DataContext: tx.price = price per share
  const getTxPricePerShare = (tx: any): number => {
    const p = num(tx?.price);
    return Number.isFinite(p) ? p : 0;
  };

  // fee belum ada di schema DataContext (fallback 0 biar UI tetap sama)
  const getTxFee = (_tx: any): number => 0;

  // Dividend di DataContext: amount (total), recordDate, paymentDate
  const getDividendTotal = (d: any) => {
    const a = num(d?.amount);
    return Number.isFinite(a) ? a : 0;
  };

  const getDividendPaymentDate = (d: any) => String(d?.paymentDate ?? d?.payment_date ?? '');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(Number.isFinite(value) ? value : 0);
  };

  const formatAssetCurrency = (value: number, currency: string) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: currency || 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

  // ======================
  // Portfolio metrics (tetap layout sama)
  // ======================
  const portfolioMetrics = useMemo(() => {
    const stockValue = holdings.reduce((sum: number, h: any) => sum + (num(h?.marketValue) || 0), 0);
    const stockCost = holdings.reduce((sum: number, h: any) => sum + (num(h?.costBasis) || 0), 0);
    const otherValue = investmentAssets.reduce((sum: number, asset: any) => sum + (num(asset?.market_value) || 0), 0);
    const otherCost = investmentAssets.reduce((sum: number, asset: any) => sum + (num(asset?.cost_basis) || 0), 0);
    const totalValue = stockValue + otherValue;
    const totalCost = stockCost + otherCost;

    const unrealizedPL = totalValue - totalCost;
    const unrealizedPLPercent = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;

    // total dividends (DataContext: Dividend.amount adalah total)
    const totalDividends = dividends.reduce((sum: number, d: any) => sum + (getDividendTotal(d) || 0), 0);

    // realizedPL sederhana: inventory avg cost per ticker (BUY/SELL)
    let realizedPL = 0;
    const txSorted = [...stockTransactions].sort((a: any, b: any) => new Date(a?.date).getTime() - new Date(b?.date).getTime());
    const inv = new Map<string, { shares: number; avg: number }>();

    for (const t of txSorted) {
      const ticker = String(t?.ticker ?? '').toUpperCase();
      const shares = getTxShares(t);
      const price = getTxPricePerShare(t);
      const type = String(t?.type ?? '').toUpperCase(); // BUY/SELL

      if (!ticker || shares <= 0 || price <= 0) continue;

      const cur = inv.get(ticker) || { shares: 0, avg: 0 };

      if (type === 'BUY') {
        const newShares = cur.shares + shares;
        const newAvg = newShares > 0 ? ((cur.shares * cur.avg) + (shares * price)) / newShares : 0;
        inv.set(ticker, { shares: newShares, avg: newAvg });
      } else if (type === 'SELL') {
        const sellShares = Math.min(cur.shares, shares);
        realizedPL += (price - cur.avg) * sellShares;
        inv.set(ticker, { shares: Math.max(0, cur.shares - sellShares), avg: cur.avg });
      }
    }

    const currentValue = totalValue;
    const peak = Math.max(currentValue, totalCost); // simpel
    const drawdown = peak > 0 ? ((peak - currentValue) / peak) * 100 : 0;

    return {
      totalValue,
      totalCost,
      unrealizedPL,
      unrealizedPLPercent,
      realizedPL,
      totalDividends,
      drawdown
    };
  }, [holdings, investmentAssets, dividends, stockTransactions]);

  const portfolioHistory = useMemo(() => [...dailyReports]
    .filter((report: any) => report?.date && Number.isFinite(Number(report?.portfolioValue)))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((report: any) => ({
      date: new Date(report.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      value: Number(report.portfolioValue),
    })), [dailyReports]);

  const allocationData = useMemo(() => ((portfolioHealth?.allocations || []) as any[])
    .filter((item: any) => Number(item?.value) > 0)
    .map((item: any) => ({
      name: compactAssetTypeLabel(String(item.asset_type || 'other')),
      value: Number(item.value),
      percentage: Number(item.percentage) || 0,
    })), [portfolioHealth]);

  const transactionHistory = useMemo(
    () => [...stockTransactions].sort((a: any, b: any) =>
      new Date(b?.date).getTime() - new Date(a?.date).getTime() || Number(b?.id || 0) - Number(a?.id || 0)
    ),
    [stockTransactions]
  );

  const dividendHistory = useMemo(
    () => [...dividends].sort((a: any, b: any) =>
      new Date(getDividendPaymentDate(b)).getTime() - new Date(getDividendPaymentDate(a)).getTime() || Number(b?.id || 0) - Number(a?.id || 0)
    ),
    [dividends]
  );

  // ======================
  // Handlers (mapping ke DataContext schema)
  // ======================
  const handleAddTransaction = async () => {
    const ticker = transactionForm.ticker.trim().toUpperCase();
    const lotsNum = num(transactionForm.lots);
    const priceNum = num(transactionForm.pricePerShare);

    if (!ticker || !transactionForm.lots || !transactionForm.pricePerShare) {
      toast.error('Mohon lengkapi semua field!');
      return;
    }
    if (!Number.isFinite(lotsNum) || lotsNum <= 0) return toast.error('Lots harus > 0');
    if (!Number.isFinite(priceNum) || priceNum <= 0) return toast.error('Price harus > 0');
    if (!transactionForm.date) return toast.error('Tanggal wajib diisi');

    if (editingTransactionId && !updateStockTransaction) return toast.error('Fitur edit transaksi belum tersedia');
    if (!editingTransactionId && !addStockTransaction) return toast.error('Fitur tambah transaksi belum tersedia');

    try {
      setSavingTransaction(true);
      // ✅ DataContext expects: { ticker, type: 'BUY'|'SELL', lots, price, date }
      const payload = {
        ticker,
        type: transactionForm.type === 'buy' ? 'BUY' : 'SELL',
        lots: lotsNum,
        price: priceNum,
        date: transactionForm.date
      };

      if (editingTransactionId) {
        await updateStockTransaction!(editingTransactionId, payload);
      } else {
        await addStockTransaction!(payload);
      }

      toast.success(editingTransactionId ? 'Transaksi berhasil diperbarui!' : `Transaksi ${transactionForm.type} berhasil ditambahkan!`);
      await loadAssetsAndHealth();
      setShowAddTransaction(false);
      setEditingTransactionId(null);
      setTransactionForm({
        ticker: '',
        type: 'buy',
        date: new Date().toISOString().split('T')[0],
        lots: '',
        pricePerShare: '',
        fee: ''
      });
    } catch (e: any) {
      console.error('Stock transaction save failed:', e);
      toast.error(e?.message || (editingTransactionId ? 'Gagal menyimpan perubahan transaksi' : 'Gagal menambahkan transaksi'));
    } finally {
      setSavingTransaction(false);
    }
  };

  const openEditTransaction = (transaction: any) => {
    setEditingTransactionId(String(transaction.id));
    setTransactionForm({
      ticker: String(transaction.ticker || '').toUpperCase(),
      type: getTxUIType(transaction),
      date: String(transaction.date || '').slice(0, 10),
      lots: String(getTxLots(transaction)),
      pricePerShare: String(getTxPricePerShare(transaction)),
      fee: '',
    });
    setShowAddTransaction(true);
  };

  const handleDeleteTransaction = async (transaction: any) => {
    if (!deleteStockTransaction) return toast.error('Fitur hapus transaksi belum tersedia');
    const confirmed = window.confirm(`Hapus transaksi ${transaction.ticker} tanggal ${new Date(transaction.date).toLocaleDateString('id-ID')}?`);
    if (!confirmed) return;
    try {
      await deleteStockTransaction(String(transaction.id));
      toast.success('Transaksi saham berhasil dihapus');
      window.setTimeout(() => void loadAssetsAndHealth(), 0);
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menghapus transaksi saham');
    }
  };

  const openAddAsset = () => {
    setEditingAssetId(null);
    setAssetForm(emptyAssetForm);
    setShowAssetModal(true);
  };

  const openEditAsset = (asset: any) => {
    const currency = asset.currency || 'IDR';
    const directValue = DIRECT_VALUE_ASSETS.has(asset.asset_type);
    const exchangeRate = Number(asset.exchange_rate_to_idr) || 1;
    const averagePrice = directValue ? Number(asset.cost_basis) / exchangeRate : Number(asset.average_price);
    const currentPrice = directValue ? Number(asset.market_value) / exchangeRate : Number(asset.current_price);
    setEditingAssetId(Number(asset.id));
    setAssetForm({
      name: asset.name, symbol: asset.symbol || '', asset_type: asset.asset_type,
      quantity: directValue ? '1' : String(asset.quantity), average_price: formatAssetAmount(String(averagePrice), currency),
      current_price: formatAssetAmount(String(currentPrice), currency), currency,
      exchange_rate_to_idr: String(asset.exchange_rate_to_idr || 1),
      acquired_date: asset.acquired_date || '', notes: asset.notes || '',
    });
    setShowAssetModal(true);
  };

  const changeAssetCurrency = (currency: string) => {
    const averagePrice = parseAssetAmount(assetForm.average_price, assetForm.currency);
    const currentPrice = parseAssetAmount(assetForm.current_price, assetForm.currency);
    setAssetForm((current) => ({
      ...current, currency,
      average_price: averagePrice ? formatAssetAmount(String(averagePrice), currency) : '',
      current_price: currentPrice ? formatAssetAmount(String(currentPrice), currency) : '',
      exchange_rate_to_idr: currency === 'IDR' ? '1' : '',
    }));
  };

  const saveAsset = async () => {
    const currencyInput = assetForm.currency.trim().toUpperCase();
    const knownCurrency = ['IDR', 'USD', 'EUR', 'SGD', 'JPY', 'CNY', 'GBP', 'AUD', 'MYR', 'THB', 'HKD', 'KRW', 'CHF', 'CAD']
      .find((code) => currencyInput.includes(code));
    const currency = currencyInput.includes('RUPIAH') || currencyInput === 'RP' ? 'IDR' : knownCurrency || currencyInput;
    const payload = {
      ...assetForm, name: assetForm.name.trim(), symbol: assetForm.symbol.trim().toUpperCase(),
      currency, notes: assetForm.notes.trim(),
      quantity: usesDirectValue ? 1 : Number(assetForm.quantity), average_price: parseAssetAmount(assetForm.average_price, currency),
      current_price: parseAssetAmount(assetForm.current_price, currency), exchange_rate_to_idr: Number(assetForm.exchange_rate_to_idr),
      acquired_date: assetForm.acquired_date || null,
    };
    const numbersAreValid = [payload.quantity, payload.average_price, payload.current_price, payload.exchange_rate_to_idr]
      .every(Number.isFinite);
    if (!payload.name || !payload.currency || !numbersAreValid || payload.quantity <= 0 || payload.average_price < 0 || payload.current_price < 0 || payload.exchange_rate_to_idr <= 0) {
      return toast.error('Lengkapi nama, jumlah, harga, mata uang, dan kurs dengan benar');
    }
    try {
      setSavingAsset(true);
      if (editingAssetId) await api.updateInvestmentAsset(editingAssetId, payload);
      else await api.createInvestmentAsset(payload);
      toast.success(editingAssetId ? 'Aset berhasil diperbarui' : 'Aset berhasil ditambahkan');
      setShowAssetModal(false);
      await loadAssetsAndHealth();
    } catch (error: any) {
      toast.error(error?.message || 'Aset gagal disimpan');
    } finally {
      setSavingAsset(false);
    }
  };

  const deleteAsset = async (asset: any) => {
    if (!window.confirm(`Hapus aset ${asset.name}?`)) return;
    try {
      await api.deleteInvestmentAsset(Number(asset.id));
      toast.success('Aset berhasil dihapus');
      await loadAssetsAndHealth();
    } catch (error: any) {
      toast.error(error?.message || 'Aset gagal dihapus');
    }
  };

  const handleAddDividend = async () => {
    if (!dividendForm.ticker || !dividendForm.dividendPerShare || !dividendForm.shares) {
      toast.error('Mohon lengkapi semua field!');
      return;
    }

    const ticker = dividendForm.ticker.trim().toUpperCase();
    const dps = num(dividendForm.dividendPerShare);
    const shares = num(dividendForm.shares);

    if (!ticker) return toast.error('Ticker wajib diisi');
    if (!Number.isFinite(dps) || dps <= 0) return toast.error('Dividen per lembar harus > 0');
    if (!Number.isFinite(shares) || shares <= 0) return toast.error('Jumlah lembar harus > 0');

    if (!addDividend) {
      toast.error('addDividend belum tersedia di DataContext');
      return;
    }

    const totalAmount = dps * shares;

    try {
      // ✅ DataContext Dividend: { ticker, amount, recordDate, paymentDate }
      await addDividend({
        ticker,
        amount: totalAmount,
        recordDate: dividendForm.recordDate || new Date().toISOString().split('T')[0],
        paymentDate: dividendForm.paymentDate || new Date().toISOString().split('T')[0]
      });

      toast.success('Dividen berhasil dicatat!');
      setShowAddDividend(false);
      setDividendForm({
        ticker: '',
        dividendPerShare: '',
        shares: '',
        recordDate: '',
        paymentDate: ''
      });
    } catch (e: any) {
      toast.error(e?.message || 'Gagal mencatat dividen');
    }
  };

  const handleUpdatePrice = () => {
    if (!priceForm.ticker || !priceForm.price) {
      toast.error('Mohon lengkapi semua field!');
      return;
    }

    const p = num(priceForm.price);
    if (!Number.isFinite(p) || p <= 0) {
      toast.error('Harga harus > 0');
      return;
    }

    // ✅ ini yang ngilangin error runtime:
    if (!updateHoldingPrice) {
      toast.error(
        'updateHoldingPrice belum ada di DataContext. Tambahkan function updateHoldingPrice di DataContext.tsx agar Update Harga berfungsi.'
      );
      return;
    }

    updateHoldingPrice(priceForm.ticker, p);
    toast.success('Harga berhasil diupdate!');
    setShowUpdatePrice(false);
    setPriceForm({ ticker: '', price: '' });
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Portfolio</h1>
          <p className="mt-1 text-sm text-gray-500">Pantau seluruh investasi dan performa portofolio Anda.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button onClick={() => setShowUpdatePrice(true)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:flex-none">
            <TrendingUp className="h-4 w-4" /> Update Harga
          </button>
          <button onClick={openAddAsset} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 sm:flex-none">
            <Plus className="h-4 w-4" /> Tambah Instrumen
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 overflow-hidden rounded-xl border border-gray-200 bg-white md:grid-cols-3">
        <div className="p-5 sm:p-6 md:border-r md:border-gray-100">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500"><Wallet className="h-4 w-4 text-blue-600" /> Total Portofolio</div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 tabular-nums">{formatCurrency(portfolioMetrics.totalValue)}</p>
          <p className="mt-2 text-xs text-gray-400">{portfolioAssetCount} aset aktif</p>
        </div>
        <div className="border-t border-gray-100 p-5 sm:p-6 md:border-r md:border-t-0">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500"><Layers3 className="h-4 w-4" /> Total Modal</div>
          <p className="mt-3 text-2xl font-semibold text-gray-900 tabular-nums">{formatCurrency(portfolioMetrics.totalCost)}</p>
          <p className="mt-2 text-xs text-gray-400">Total cost basis seluruh posisi</p>
        </div>
        <div className="border-t border-gray-100 p-5 sm:p-6 md:border-t-0">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">{portfolioMetrics.unrealizedPL >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />} Total P/L</div>
          <p className={`mt-3 text-2xl font-semibold tabular-nums ${portfolioMetrics.unrealizedPL > 0 ? 'text-emerald-600' : portfolioMetrics.unrealizedPL < 0 ? 'text-red-600' : 'text-gray-900'}`}>{portfolioMetrics.unrealizedPL > 0 ? '+' : ''}{formatCurrency(portfolioMetrics.unrealizedPL)}</p>
          <p className={`mt-2 text-xs font-medium ${portfolioMetrics.unrealizedPL > 0 ? 'text-emerald-600' : portfolioMetrics.unrealizedPL < 0 ? 'text-red-600' : 'text-gray-400'}`}>{portfolioMetrics.unrealizedPLPercent > 0 ? '+' : ''}{portfolioMetrics.unrealizedPLPercent.toFixed(2)}%</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(300px,1fr)]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="font-semibold text-gray-900">Portfolio Performance</h2><p className="mt-1 text-xs text-gray-500">Perkembangan nilai dari data laporan yang tersedia.</p></div><BarChart3 className="h-5 w-5 text-gray-400" /></div>
          {portfolioHistory.length > 0 ? <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioHistory} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs><linearGradient id="portfolioArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.18}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 10, borderColor: '#e5e7eb', boxShadow: '0 8px 24px rgba(15,23,42,.08)' }} />
                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.25} fill="url(#portfolioArea)" name="Nilai Portofolio" />
              </AreaChart>
            </ResponsiveContainer>
          </div> : <div className="flex h-64 flex-col items-center justify-center text-center"><BarChart3 className="h-8 w-8 text-gray-300"/><p className="mt-3 text-sm font-medium text-gray-700">Belum ada histori performa</p><p className="mt-1 max-w-xs text-xs text-gray-400">Grafik akan menggunakan data laporan portofolio yang memang tersimpan, tanpa membuat data estimasi.</p></div>}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold text-gray-900">Asset Allocation</h2><p className="mt-1 text-xs text-gray-500">Komposisi berdasarkan nilai kini.</p></div><PieChartIcon className="h-5 w-5 text-gray-400" /></div>
          {allocationData.length > 0 ? <>
            <div className="mx-auto h-44 max-w-[240px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={74} paddingAngle={2} stroke="none">{allocationData.map((entry, index) => <Cell key={entry.name} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />)}</Pie><Tooltip formatter={(value: any) => formatCurrency(Number(value))} /></PieChart></ResponsiveContainer></div>
            <div className="space-y-2">{allocationData.slice(0, 6).map((entry, index) => <div key={entry.name} className="flex items-center justify-between gap-3 text-xs"><div className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] }} /><span className="truncate text-gray-600">{entry.name}</span></div><span className="font-medium tabular-nums text-gray-800">{entry.percentage.toFixed(1)}%</span></div>)}</div>
          </> : <div className="flex h-64 flex-col items-center justify-center text-center"><PieChartIcon className="h-8 w-8 text-gray-300"/><p className="mt-3 text-sm font-medium text-gray-700">Belum ada alokasi aset</p><p className="mt-1 text-xs text-gray-400">Tambahkan instrumen untuk melihat komposisi.</p></div>}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><div className="flex items-center gap-2"><h2 className="font-semibold text-gray-900">Portofolio Saya</h2><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{portfolioAssetCount} aset</span></div><p className="mt-1 text-sm text-gray-500">Seluruh saham dan instrumen investasi Anda dalam satu tempat.</p></div>
          <button onClick={() => { setEditingTransactionId(null); setShowAddTransaction(true); }} className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:self-auto"><Plus className="h-4 w-4" /> Catat Saham</button>
        </div>
        {assetLoading && portfolioAssetCount === 0 ? <div className="space-y-3 p-6">{[1,2,3].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-gray-100" />)}</div> : portfolioAssetCount === 0 ? <div className="px-6 py-14 text-center"><Layers3 className="mx-auto h-9 w-9 text-gray-300"/><p className="mt-3 text-sm font-medium text-gray-700">Portofolio masih kosong</p><p className="mt-1 text-xs text-gray-400">Tambahkan instrumen atau catat transaksi saham pertama Anda.</p><button onClick={openAddAsset} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Tambah Instrumen</button></div> : <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50/70"><tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400"><th className="px-6 py-3 text-left">Aset</th><th className="px-4 py-3 text-left">Kepemilikan</th><th className="px-4 py-3 text-right">Modal</th><th className="px-4 py-3 text-right">Nilai Kini</th><th className="px-4 py-3 text-right">P/L</th><th className="px-4 py-3 text-left">Jenis</th><th className="px-6 py-3 text-right">Aksi</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {holdings.map((holding: any) => <tr key={`stock-${holding.ticker}`} className="transition hover:bg-gray-50/60"><td className="px-6 py-4"><p className="font-medium text-gray-900">{holding.ticker}</p></td><td className="px-4 py-4 text-sm text-gray-700"><p>{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(holding.totalLots)} lot</p><p className="mt-0.5 text-xs text-gray-400">{Number(holding.totalShares).toLocaleString('id-ID')} lembar</p></td><td className="px-4 py-4 text-right text-sm font-medium tabular-nums text-gray-700">{formatCurrency(num(holding.costBasis) || 0)}</td><td className="px-4 py-4 text-right text-sm font-semibold tabular-nums text-gray-900">{formatCurrency(num(holding.marketValue) || 0)}</td><td className={`px-4 py-4 text-right text-sm font-semibold tabular-nums ${num(holding.unrealizedPL) > 0 ? 'text-emerald-600' : num(holding.unrealizedPL) < 0 ? 'text-red-600' : 'text-gray-700'}`}><p>{num(holding.unrealizedPL) > 0 ? '+' : ''}{formatCurrency(num(holding.unrealizedPL) || 0)}</p><p className="mt-0.5 text-xs font-medium">{num(holding.unrealizedPLPercent) > 0 ? '+' : ''}{(num(holding.unrealizedPLPercent) || 0).toFixed(2)}%</p></td><td className="px-4 py-4"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Saham</span></td><td className="px-6 py-4 text-right"><button onClick={() => { setSelectedTicker(holding.ticker); setPriceForm({ ticker: holding.ticker, price: String(holding.currentPrice || '') }); setShowUpdatePrice(true); }} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="Update harga"><Pencil className="h-4 w-4" /></button></td></tr>)}
                {investmentAssets.map((asset) => <tr key={`asset-${asset.id}`} className="transition hover:bg-gray-50/60"><td className="px-6 py-4"><p className="font-medium text-gray-900">{asset.name}</p>{asset.symbol && <p className="mt-0.5 text-xs text-gray-400">{asset.symbol}</p>}</td><td className="px-4 py-4 text-sm text-gray-700">{assetQuantitySummary(asset)}</td><td className="px-4 py-4 text-right text-sm font-medium tabular-nums text-gray-700"><p>{formatCurrency(asset.cost_basis)}</p>{asset.currency !== 'IDR' && <p className="mt-0.5 text-xs font-normal text-gray-400">{formatAssetCurrency(asset.quantity * asset.average_price, asset.currency)}</p>}</td><td className="px-4 py-4 text-right text-sm font-semibold tabular-nums text-gray-900"><p>{formatCurrency(asset.market_value)}</p>{asset.currency !== 'IDR' && <p className="mt-0.5 text-xs font-normal text-gray-400">{formatAssetCurrency(asset.quantity * asset.current_price, asset.currency)}</p>}</td><td className={`px-4 py-4 text-right text-sm font-semibold tabular-nums ${asset.unrealized_pl > 0 ? 'text-emerald-600' : asset.unrealized_pl < 0 ? 'text-red-600' : 'text-gray-700'}`}><p>{asset.unrealized_pl > 0 ? '+' : ''}{formatCurrency(asset.unrealized_pl)}</p><p className="mt-0.5 text-xs font-medium">{asset.unrealized_pl_percent > 0 ? '+' : ''}{Number(asset.unrealized_pl_percent || 0).toFixed(2)}%</p></td><td className="px-4 py-4"><span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">{compactAssetTypeLabel(asset.asset_type)}</span></td><td className="px-6 py-4"><div className="flex justify-end gap-1"><button onClick={() => openEditAsset(asset)} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="Edit aset"><Pencil className="h-4 w-4" /></button><button onClick={() => deleteAsset(asset)} className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Hapus aset"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-gray-100 md:hidden">
            {holdings.map((holding: any) => <div key={`mobile-stock-${holding.ticker}`} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-gray-900">{holding.ticker}</p><p className="mt-1 text-xs text-gray-400">{holding.totalLots} lot · {Number(holding.totalShares).toLocaleString('id-ID')} lembar</p></div><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Saham</span></div><div className="mt-4 grid grid-cols-2 gap-4"><div><p className="text-xs text-gray-400">Modal</p><p className="mt-1 text-sm font-medium tabular-nums text-gray-700">{formatCurrency(num(holding.costBasis) || 0)}</p></div><div className="text-right"><p className="text-xs text-gray-400">Nilai Kini</p><p className="mt-1 text-sm font-semibold tabular-nums text-gray-900">{formatCurrency(num(holding.marketValue) || 0)}</p></div></div><div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-3"><div><p className="text-xs text-gray-400">P/L</p><p className={`mt-1 text-sm font-semibold tabular-nums ${num(holding.unrealizedPL) > 0 ? 'text-emerald-600' : num(holding.unrealizedPL) < 0 ? 'text-red-600' : 'text-gray-700'}`}>{num(holding.unrealizedPL) > 0 ? '+' : ''}{formatCurrency(num(holding.unrealizedPL) || 0)} <span className="text-xs">({(num(holding.unrealizedPLPercent) || 0).toFixed(2)}%)</span></p></div><button onClick={() => { setSelectedTicker(holding.ticker); setPriceForm({ ticker: holding.ticker, price: String(holding.currentPrice || '') }); setShowUpdatePrice(true); }} className="rounded-md border border-gray-200 p-2 text-gray-500"><Pencil className="h-4 w-4" /></button></div></div>)}
            {investmentAssets.map((asset) => <div key={`mobile-asset-${asset.id}`} className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium text-gray-900">{asset.name}</p>{asset.symbol && <p className="mt-1 text-xs text-gray-400">{asset.symbol} · {assetQuantitySummary(asset)}</p>}{!asset.symbol && <p className="mt-1 text-xs text-gray-400">{assetQuantitySummary(asset)}</p>}</div><span className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">{compactAssetTypeLabel(asset.asset_type)}</span></div><div className="mt-4 grid grid-cols-2 gap-4"><div><p className="text-xs text-gray-400">Modal</p><p className="mt-1 text-sm font-medium tabular-nums text-gray-700">{formatCurrency(asset.cost_basis)}</p>{asset.currency !== 'IDR' && <p className="mt-0.5 text-xs text-gray-400">{formatAssetCurrency(asset.quantity * asset.average_price, asset.currency)}</p>}</div><div className="text-right"><p className="text-xs text-gray-400">Nilai Kini</p><p className="mt-1 text-sm font-semibold tabular-nums text-gray-900">{formatCurrency(asset.market_value)}</p>{asset.currency !== 'IDR' && <p className="mt-0.5 text-xs text-gray-400">{formatAssetCurrency(asset.quantity * asset.current_price, asset.currency)}</p>}</div></div><div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-3"><div><p className="text-xs text-gray-400">P/L</p><p className={`mt-1 text-sm font-semibold tabular-nums ${asset.unrealized_pl > 0 ? 'text-emerald-600' : asset.unrealized_pl < 0 ? 'text-red-600' : 'text-gray-700'}`}>{asset.unrealized_pl > 0 ? '+' : ''}{formatCurrency(asset.unrealized_pl)} <span className="text-xs">({Number(asset.unrealized_pl_percent || 0).toFixed(2)}%)</span></p></div><div className="flex gap-1"><button onClick={() => openEditAsset(asset)} className="rounded-md border border-gray-200 p-2 text-gray-500"><Pencil className="h-4 w-4" /></button><button onClick={() => deleteAsset(asset)} className="rounded-md border border-gray-200 p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div></div></div>)}
          </div>
        </>}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center"><div className="flex min-w-[190px] items-center gap-3"><div className="rounded-lg bg-blue-50 p-2.5 text-blue-600"><Activity className="h-5 w-5" /></div><div><p className="text-xs text-gray-400">Kesehatan Portfolio</p><div className="mt-1 flex items-baseline gap-2"><span className="text-2xl font-semibold text-gray-900">{portfolioHealth?.score ?? 0}</span><span className="text-xs text-gray-400">/ 100</span></div><p className="text-xs font-medium text-gray-600">{portfolioHealth?.status || (assetLoading ? 'Menghitung…' : 'Belum dapat dinilai')}</p></div></div><div className="grid flex-1 grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">{[['Diversifikasi', portfolioHealth?.diversification_score], ['Konsentrasi', portfolioHealth?.concentration_score], ['Likuiditas', portfolioHealth?.liquidity_score], ['Risiko', portfolioHealth?.risk_score]].map(([label, value]) => <div key={String(label)}><div className="flex items-center justify-between text-xs"><span className="text-gray-500">{label}</span><span className="font-medium text-gray-700">{Number(value) || 0}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} /></div></div>)}</div></div>
        {(portfolioHealth?.insights || []).length > 0 && <div className="mt-5 border-t border-gray-100 pt-4"><div className="flex flex-wrap gap-x-6 gap-y-2">{portfolioHealth.insights.slice(0, 3).map((insight: string, index: number) => <p key={index} className="flex max-w-xl gap-2 text-xs leading-relaxed text-gray-500"><span className="text-blue-500">•</span>{insight}</p>)}</div><p className="mt-3 text-[11px] text-gray-400">Indikator edukatif, bukan rekomendasi investasi.</p></div>}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-semibold text-gray-900">Aktivitas Saham</h2><p className="mt-1 text-xs text-gray-500">Transaksi terbaru Anda.</p></div><button onClick={() => { setEditingTransactionId(null); setShowAddTransaction(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"><Plus className="h-3.5 w-3.5" /> Catat</button></div>
          <div className="max-h-[360px] divide-y divide-gray-100 overflow-y-auto">{transactionHistory.map((tx: any) => { const uiType = getTxUIType(tx); const lots = getTxLots(tx); const shares = getTxShares(tx); const price = getTxPricePerShare(tx); return <div key={tx.id} className="flex items-center justify-between gap-4 px-5 py-3.5"><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-medium text-gray-900">{tx.ticker}</p><span className={`text-[10px] font-semibold ${uiType === 'buy' ? 'text-emerald-600' : 'text-red-600'}`}>{uiType === 'buy' ? 'BELI' : 'JUAL'}</span></div><p className="mt-1 text-xs text-gray-400">{lots} lot · {new Date(tx.date).toLocaleDateString('id-ID')}</p></div><div className="text-right"><p className="text-sm font-medium tabular-nums text-gray-800">{formatCurrency(shares * price)}</p><div className="mt-1 flex justify-end gap-2"><button onClick={() => openEditTransaction(tx)} className="text-gray-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => handleDeleteTransaction(tx)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div></div></div>})}{transactionHistory.length === 0 && <div className="px-5 py-12 text-center"><p className="text-sm font-medium text-gray-700">Belum ada transaksi saham</p><p className="mt-1 text-xs text-gray-400">Catat transaksi beli atau jual pertama Anda.</p></div>}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-semibold text-gray-900">Investment Income</h2><p className="mt-1 text-xs text-gray-500">Total dividen <span className="font-semibold text-emerald-600">{formatCurrency(portfolioMetrics.totalDividends)}</span></p></div><button onClick={() => setShowAddDividend(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"><DollarSign className="h-3.5 w-3.5" /> Catat Dividen</button></div>
          <div className="max-h-[360px] divide-y divide-gray-100 overflow-y-auto">{dividendHistory.map((div: any) => { const payment = getDividendPaymentDate(div); return <div key={div.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium text-gray-900">{div.ticker}</p><p className="mt-1 text-xs text-gray-400">{payment ? new Date(payment).toLocaleDateString('id-ID') : 'Tanggal belum tersedia'}</p></div><p className="text-sm font-semibold tabular-nums text-emerald-600">+{formatCurrency(getDividendTotal(div))}</p></div>})}{dividendHistory.length === 0 && <div className="px-5 py-12 text-center"><p className="text-sm font-medium text-gray-700">Belum ada pendapatan dividen</p><p className="mt-1 text-xs text-gray-400">Catat dividen ketika pembayaran diterima.</p></div>}</div>
        </div>
      </section>

      {/* Generic asset modal */}
      {showAssetModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }} onClick={() => setShowAssetModal(false)} role="dialog" aria-modal="true">
          <div className="relative bg-white rounded-xl max-w-md w-full p-6 overflow-y-auto" style={{ maxHeight: '90vh' }} onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setShowAssetModal(false)} className="absolute top-4 right-4 p-1 text-gray-500"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-gray-900 pr-8">{editingAssetId ? 'Edit Instrumen' : 'Tambah Instrumen Investasi'}</h3>
            <p className="text-sm text-gray-500 mt-1 mb-5">Form akan menyesuaikan satuan dan nilai berdasarkan instrumen yang dipilih.</p>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Jenis Instrumen</label><select value={assetForm.asset_type} onChange={(e) => { const assetType = e.target.value; setAssetForm({ ...assetForm, asset_type: assetType, quantity: DIRECT_VALUE_ASSETS.has(assetType) ? '1' : assetForm.quantity }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg">{ASSET_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama Aset</label><input value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Contoh: Bitcoin, Emas Antam, Rumah Jakarta" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Simbol / Kode <span className="text-gray-400">(opsional)</span></label><input value={assetForm.symbol} onChange={(e) => setAssetForm({ ...assetForm, symbol: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="BTC, XAU, FR0096" /></div>
              <div className={`grid grid-cols-1 ${usesDirectValue ? '' : 'sm:grid-cols-2'} gap-3`}>
                {!usesDirectValue && <div><label className="block text-sm font-medium text-gray-700 mb-1">{assetFields.quantity}</label><input type="number" inputMode="decimal" step="any" min="0" value={assetForm.quantity} onChange={(e) => setAssetForm({ ...assetForm, quantity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Contoh: 1" /><p className="text-xs text-gray-500 mt-1">{assetFields.hint}</p></div>}
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Mata Uang</label><select value={assetForm.currency} onChange={(e) => void changeAssetCurrency(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">{CURRENCY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}</select><p className="text-xs text-gray-500 mt-1">{usesDirectValue ? assetFields.hint : 'Mata uang untuk nilai per unit.'}</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{assetFields.buy}</label>
                  <div className="flex">
                    <span className="flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-100 text-sm font-medium text-gray-600">{assetForm.currency}</span>
                    <input type="text" inputMode="numeric" value={assetForm.average_price} onChange={(e) => setAssetForm({ ...assetForm, average_price: formatAssetAmount(e.target.value, assetForm.currency) })} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-r-lg" placeholder="Masukkan nilai" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{assetFields.current}</label>
                  <div className="flex">
                    <span className="flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-100 text-sm font-medium text-gray-600">{assetForm.currency}</span>
                    <input type="text" inputMode="numeric" value={assetForm.current_price} onChange={(e) => setAssetForm({ ...assetForm, current_price: formatAssetAmount(e.target.value, assetForm.currency) })} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-r-lg" placeholder="Masukkan nilai" />
                  </div>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Kurs 1 {assetForm.currency} ke IDR</label><input type="number" step="any" value={assetForm.exchange_rate_to_idr} onChange={(e) => setAssetForm({ ...assetForm, exchange_rate_to_idr: e.target.value })} disabled={assetForm.currency === 'IDR'} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100" placeholder={assetForm.currency === 'IDR' ? '1' : 'Masukkan kurs manual'} /><p className="text-xs text-gray-500 mt-1">{assetForm.currency === 'IDR' ? 'Kurs Rupiah tetap bernilai 1.' : `Isi manual. Contoh: jika 1 ${assetForm.currency} = Rp17.000, masukkan 17000.`}</p></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Perolehan</label><input type="date" value={assetForm.acquired_date} onChange={(e) => setAssetForm({ ...assetForm, acquired_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label><textarea value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            </div>
            <div className="flex gap-2 mt-6"><button disabled={savingAsset} onClick={() => setShowAssetModal(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">Batal</button><button disabled={savingAsset} onClick={saveAsset} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{savingAsset ? 'Menyimpan…' : editingAssetId ? 'Simpan Perubahan' : 'Simpan Aset'}</button></div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }}
          onClick={() => setShowAddTransaction(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="asset-modal-title"
        >
          <div className="relative bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setShowAddTransaction(false)} className="absolute top-4 right-4 p-1 text-gray-500 hover:text-gray-800" aria-label="Tutup popup catat aset">
              <X className="w-5 h-5" />
            </button>
            <h3 id="asset-modal-title" className="text-xl font-bold text-gray-900 mb-1 pr-8">{editingTransactionId ? 'Edit Transaksi Saham' : 'Catat Aset Saham'}</h3>
            <p className="text-sm text-gray-500 mb-4">{editingTransactionId ? 'Perbaiki data yang salah lalu simpan perubahan.' : 'Gunakan Beli untuk menambah kepemilikan dan Jual untuk menguranginya.'}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTransactionForm({ ...transactionForm, type: 'buy' })}
                    className={`py-2 rounded-lg font-medium ${
                      transactionForm.type === 'buy' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTransactionForm({ ...transactionForm, type: 'sell' })}
                    className={`py-2 rounded-lg font-medium ${
                      transactionForm.type === 'sell' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Sell
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ticker</label>
                <input
                  type="text"
                  value={transactionForm.ticker}
                  onChange={(e) => setTransactionForm({ ...transactionForm, ticker: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="BBCA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lot (1 lot = 100 lembar)</label>
                <input
                  type="number"
                  value={transactionForm.lots}
                  onChange={(e) => setTransactionForm({ ...transactionForm, lots: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga per Lembar</label>
                <input
                  type="number"
                  value={transactionForm.pricePerShare}
                  onChange={(e) => setTransactionForm({ ...transactionForm, pricePerShare: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="10000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee</label>
                <input
                  type="number"
                  value={transactionForm.fee}
                  onChange={(e) => setTransactionForm({ ...transactionForm, fee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="25000"
                />
                <p className="text-xs text-gray-500 mt-1">*Fee saat ini hanya untuk tampilan (belum disimpan ke backend/context).</p>
              </div>

              {transactionForm.lots && transactionForm.pricePerShare && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Total:</strong>{' '}
                    {formatCurrency(
                      (num(transactionForm.lots) * 100 * num(transactionForm.pricePerShare)) + (num(transactionForm.fee) || 0)
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => { setShowAddTransaction(false); setEditingTransactionId(null); }}
                disabled={savingTransaction}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddTransaction}
                disabled={savingTransaction}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {savingTransaction ? 'Menyimpan…' : editingTransactionId ? 'Simpan Perubahan' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Dividend Modal */}
      {showAddDividend && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }}
          onClick={() => setShowAddDividend(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dividend-modal-title"
        >
          <div className="relative bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setShowAddDividend(false)} className="absolute top-4 right-4 p-1 text-gray-500 hover:text-gray-800" aria-label="Tutup popup dividen">
              <X className="w-5 h-5" />
            </button>
            <h3 id="dividend-modal-title" className="text-xl font-bold text-gray-900 mb-4 pr-8">Catat Dividen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ticker</label>
                <input
                  type="text"
                  value={dividendForm.ticker}
                  onChange={(e) => setDividendForm({ ...dividendForm, ticker: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="BBCA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dividen per Lembar</label>
                <input
                  type="number"
                  value={dividendForm.dividendPerShare}
                  onChange={(e) => setDividendForm({ ...dividendForm, dividendPerShare: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="250"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Lembar</label>
                <input
                  type="number"
                  value={dividendForm.shares}
                  onChange={(e) => setDividendForm({ ...dividendForm, shares: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Record Date</label>
                <input
                  type="date"
                  value={dividendForm.recordDate}
                  onChange={(e) => setDividendForm({ ...dividendForm, recordDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={dividendForm.paymentDate}
                  onChange={(e) => setDividendForm({ ...dividendForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {dividendForm.dividendPerShare && dividendForm.shares && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-900">
                    <strong>Total Dividen:</strong>{' '}
                    {formatCurrency(num(dividendForm.dividendPerShare) * num(dividendForm.shares))}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddDividend(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleAddDividend}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Price Modal */}
      {showUpdatePrice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Update Harga Saham</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ticker</label>
                <select
                  value={priceForm.ticker}
                  onChange={(e) => setPriceForm({ ...priceForm, ticker: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih Saham</option>
                  {holdings.map((h: any) => (
                    <option key={h.ticker} value={h.ticker}>
                      {h.ticker}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Baru</label>
                <input
                  type="number"
                  value={priceForm.price}
                  onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="10250"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowUpdatePrice(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleUpdatePrice}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
