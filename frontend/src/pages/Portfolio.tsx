import { Fragment, useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, TrendingUp, DollarSign, X, Pencil, Trash2, Activity, Layers3 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

const ASSET_TYPES = [
  ['stock', 'Saham'], ['etf', 'ETF'], ['money_market_fund', 'Reksa Dana Pasar Uang (RDPU)'], ['mutual_fund', 'Reksa Dana Lainnya'], ['bond', 'Obligasi'],
  ['deposit', 'Deposito'], ['cash', 'Kas'], ['crypto', 'Kripto'], ['gold', 'Emas'],
  ['commodity', 'Komoditas'], ['property', 'Properti'], ['business', 'Bisnis'],
  ['private_equity', 'Private Equity'], ['p2p', 'P2P Lending'], ['pension', 'Dana Pensiun'],
  ['insurance_investment', 'Asuransi Investasi'], ['collectible', 'Koleksi'],
  ['forex', 'Forex'], ['derivative', 'Derivatif'], ['other', 'Lainnya'],
] as const;

const assetTypeLabel = (type: string) => ASSET_TYPES.find(([value]) => value === type)?.[1] || type;

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
  const [showAllPortfolioAssets, setShowAllPortfolioAssets] = useState(false);
  const emptyAssetForm = {
    name: '', symbol: '', asset_type: 'mutual_fund', quantity: '1', average_price: '',
    current_price: '', currency: 'IDR', exchange_rate_to_idr: '1', acquired_date: '', notes: '',
  };
  const [assetForm, setAssetForm] = useState(emptyAssetForm);
  const assetFields = ASSET_FIELD_LABELS[assetForm.asset_type] || DEFAULT_ASSET_FIELDS;
  const usesDirectValue = DIRECT_VALUE_ASSETS.has(assetForm.asset_type);
  const portfolioHoldings = holdings.filter((holding: any) => {
    const marketValue = Number(holding?.marketValue);
    return Number.isFinite(marketValue) && marketValue !== 0;
  });
  const portfolioInvestmentAssets = investmentAssets.filter((asset: any) => {
    const marketValue = Number(asset?.market_value);
    return Number.isFinite(marketValue) && marketValue !== 0;
  });
  const portfolioAssetCount = portfolioHoldings.length + portfolioInvestmentAssets.length;
  let previewHoldingCount = Math.min(portfolioHoldings.length, portfolioInvestmentAssets.length > 0 ? 3 : 6);
  let previewAssetCount = Math.min(portfolioInvestmentAssets.length, 6 - previewHoldingCount);
  previewHoldingCount += Math.min(portfolioHoldings.length - previewHoldingCount, 6 - previewHoldingCount - previewAssetCount);
  previewAssetCount += Math.min(portfolioInvestmentAssets.length - previewAssetCount, 6 - previewHoldingCount - previewAssetCount);
  const visibleHoldings = showAllPortfolioAssets ? portfolioHoldings : portfolioHoldings.slice(0, previewHoldingCount);
  const visibleInvestmentAssets = showAllPortfolioAssets ? portfolioInvestmentAssets : portfolioInvestmentAssets.slice(0, previewAssetCount);
  const visibleAssetSections = Object.entries(
    visibleInvestmentAssets.reduce((sections: Record<string, any[]>, asset: any) => {
      (sections[asset.asset_type] ||= []).push(asset);
      return sections;
    }, {})
  ) as [string, any[]][];

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

  useEffect(() => {
    const modalOpen = showAssetModal || showAddTransaction || showAddDividend || showUpdatePrice;
    if (!modalOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showAssetModal, showAddTransaction, showAddDividend, showUpdatePrice]);

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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="portfolio-page-header order-1 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portofolio Investasi</h1>
          <p className="text-gray-600">Kelola seluruh instrumen investasi dan pantau kesehatan portofolio</p>
        </div>
        <div className="portfolio-header-actions flex flex-wrap gap-2">
          <button onClick={openAddAsset} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Layers3 className="w-4 h-4" /> Tambah Instrumen
          </button>
          <button
            onClick={() => setShowUpdatePrice(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Update Harga
          </button>
          <button
            onClick={() => setShowAddDividend(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            Dividen
          </button>
          <button
            onClick={() => {
              setEditingTransactionId(null);
              setShowAddTransaction(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Catat Saham
          </button>
        </div>
      </div>

      {/* Portfolio health */}
      <div className="order-4">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Kesehatan Portofolio</p>
              <div className="flex items-end gap-3 mt-1">
                <p className="text-4xl font-bold text-gray-900">{portfolioHealth?.score ?? 0}</p>
                <p className="text-sm text-gray-500 mb-1">/ 100</p>
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Activity className="w-6 h-6" /></div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div className="h-2 rounded-full" style={{ width: `${portfolioHealth?.score || 0}%`, backgroundColor: (portfolioHealth?.score || 0) >= 75 ? '#22c55e' : (portfolioHealth?.score || 0) >= 55 ? '#3b82f6' : (portfolioHealth?.score || 0) >= 35 ? '#eab308' : '#ef4444' }} />
          </div>
          <p className="font-semibold text-gray-900 mt-3">{portfolioHealth?.status || (assetLoading ? 'Menghitung…' : 'Belum dapat dinilai')}</p>
          <div className="portfolio-health-grid grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg"><p className="text-gray-500">Diversifikasi</p><p className="font-semibold">{portfolioHealth?.diversification_score ?? 0}/100</p></div>
            <div className="p-3 bg-gray-50 rounded-lg"><p className="text-gray-500">Konsentrasi</p><p className="font-semibold">{portfolioHealth?.concentration_score ?? 0}/100</p></div>
            <div className="p-3 bg-gray-50 rounded-lg"><p className="text-gray-500">Likuiditas</p><p className="font-semibold">{portfolioHealth?.liquidity_score ?? 0}/100</p></div>
            <div className="p-3 bg-gray-50 rounded-lg"><p className="text-gray-500">Keseimbangan risiko</p><p className="font-semibold">{portfolioHealth?.risk_score ?? 0}/100</p></div>
          </div>
        </div>
      </div>

      {/* Unified portfolio */}
      <div className="order-3 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-start sm:items-center justify-between gap-4 mb-4">
          <div><h3 className="font-semibold text-gray-900">Portofolio Saya</h3><p className="text-sm text-gray-500">Seluruh saham dan instrumen investasi Anda dalam satu tempat.</p></div>
          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">{portfolioAssetCount} aset</span>
        </div>
        <div className="portfolio-mobile-list space-y-3 md:hidden">
          {visibleHoldings.length > 0 && <div className="flex items-center justify-between pt-1"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Saham</p><span className="text-xs text-gray-400">{visibleHoldings.length} aset</span></div>}
          {visibleHoldings.map((holding: any) => <div key={`mobile-stock-${holding.ticker}`} className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-gray-900">{holding.ticker}</p><p className="text-xs text-gray-500 mt-0.5">{holding.totalLots} lot · {holding.totalShares} lembar</p></div><span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">Saham</span></div>
            <div className="grid grid-cols-2 gap-3 mt-4"><div><p className="text-xs text-gray-500">Modal</p><p className="text-sm font-medium mt-1">{formatCurrency(num(holding.costBasis) || 0)}</p></div><div className="text-right"><p className="text-xs text-gray-500">Nilai kini</p><p className="text-sm font-semibold mt-1">{formatCurrency(num(holding.marketValue) || 0)}</p></div></div>
            <div className="flex items-end justify-between gap-3 mt-4 pt-3 border-t border-gray-100"><div><p className="text-xs text-gray-500">P/L</p><p className={`text-sm font-semibold mt-1 ${num(holding.unrealizedPL) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{num(holding.unrealizedPL) >= 0 ? '+' : ''}{formatCurrency(num(holding.unrealizedPL) || 0)} <span className="text-xs">({(num(holding.unrealizedPLPercent) || 0).toFixed(2)}%)</span></p></div><button onClick={() => { setSelectedTicker(holding.ticker); setPriceForm({ ticker: holding.ticker, price: String(holding.currentPrice || '') }); setShowUpdatePrice(true); }} className="p-2.5 text-blue-600 bg-blue-50 rounded-lg" aria-label={`Update harga ${holding.ticker}`}><Pencil className="w-4 h-4" /></button></div>
          </div>)}
          {visibleAssetSections.map(([assetType, assets]) => <div key={`mobile-section-${assetType}`} className="space-y-3 pt-1">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{assetTypeLabel(assetType)}</p><span className="text-xs text-gray-400">{assets.length} aset</span></div>
            {assets.map((asset) => <div key={`mobile-asset-${asset.id}`} className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-gray-900 truncate">{asset.name}</p><p className="text-xs text-gray-500 mt-0.5">{asset.symbol || 'Tanpa simbol'} · {assetQuantitySummary(asset)}</p></div><span className="shrink-0 px-2 py-1 bg-violet-50 text-violet-700 text-xs rounded-full">{assetTypeLabel(asset.asset_type)}</span></div>
            <div className="grid grid-cols-2 gap-3 mt-4"><div><p className="text-xs text-gray-500">Modal</p><p className="text-sm font-medium mt-1">{asset.currency === 'IDR' ? formatCurrency(asset.cost_basis) : formatAssetCurrency(asset.quantity * asset.average_price, asset.currency)}</p>{asset.currency !== 'IDR' && <p className="text-xs text-gray-500">≈ {formatCurrency(asset.cost_basis)}</p>}</div><div className="text-right"><p className="text-xs text-gray-500">Nilai kini</p><p className="text-sm font-semibold mt-1">{asset.currency === 'IDR' ? formatCurrency(asset.market_value) : formatAssetCurrency(asset.quantity * asset.current_price, asset.currency)}</p>{asset.currency !== 'IDR' && <p className="text-xs text-gray-500">≈ {formatCurrency(asset.market_value)}</p>}</div></div>
            <div className="flex items-end justify-between gap-3 mt-4 pt-3 border-t border-gray-100"><div><p className="text-xs text-gray-500">P/L</p><p className={`text-sm font-semibold mt-1 ${asset.unrealized_pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{asset.unrealized_pl >= 0 ? '+' : ''}{formatCurrency(asset.unrealized_pl)}</p></div><div className="flex gap-1"><button onClick={() => openEditAsset(asset)} className="p-2.5 text-blue-600 bg-blue-50 rounded-lg" aria-label={`Edit ${asset.name}`}><Pencil className="w-4 h-4" /></button><button onClick={() => deleteAsset(asset)} className="p-2.5 text-red-600 bg-red-50 rounded-lg" aria-label={`Hapus ${asset.name}`}><Trash2 className="w-4 h-4" /></button></div></div>
            </div>)}
          </div>)}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 text-sm font-medium text-gray-700">Aset</th>
              <th className="text-left py-3 px-3 text-sm font-medium text-gray-700">Jenis</th>
              <th className="text-right py-3 px-3 text-sm font-medium text-gray-700">Modal</th>
              <th className="text-right py-3 px-3 text-sm font-medium text-gray-700">Nilai Kini</th>
              <th className="text-right py-3 px-3 text-sm font-medium text-gray-700">P/L</th>
              <th className="text-right py-3 px-3 text-sm font-medium text-gray-700">Aksi</th>
            </tr></thead>
            <tbody>
              {visibleHoldings.length > 0 && <tr className="bg-gray-50"><td colSpan={6} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Saham · {visibleHoldings.length} aset</td></tr>}
              {visibleHoldings.map((holding: any) => <tr key={`stock-${holding.ticker}`} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 px-3"><p className="font-medium text-gray-900">{holding.ticker}</p><p className="text-xs text-gray-500">{holding.totalLots} lot · {holding.totalShares} lembar</p></td>
                <td className="py-2.5 px-3 text-sm text-gray-700">Saham</td>
                <td className="py-2.5 px-3 text-right text-sm">{formatCurrency(num(holding.costBasis) || 0)}</td>
                <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(num(holding.marketValue) || 0)}</td>
                <td className={`py-2.5 px-3 text-right text-sm font-medium ${num(holding.unrealizedPL) >= 0 ? 'text-green-600' : 'text-red-600'}`}><p>{num(holding.unrealizedPL) >= 0 ? '+' : ''}{formatCurrency(num(holding.unrealizedPL) || 0)}</p><p className="text-xs">({num(holding.unrealizedPLPercent) >= 0 ? '+' : ''}{(num(holding.unrealizedPLPercent) || 0).toFixed(2)}%)</p></td>
                <td className="py-2.5 px-3 text-right"><button onClick={() => { setSelectedTicker(holding.ticker); setPriceForm({ ticker: holding.ticker, price: String(holding.currentPrice || '') }); setShowUpdatePrice(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" aria-label={`Update harga ${holding.ticker}`}><Pencil className="w-4 h-4" /></button></td>
              </tr>)}
              {visibleAssetSections.map(([assetType, assets]) => <Fragment key={`section-${assetType}`}>
              <tr className="bg-gray-50"><td colSpan={6} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{assetTypeLabel(assetType)} · {assets.length} aset</td></tr>
              {assets.map((asset) => <tr key={`asset-${asset.id}`} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2.5 px-3"><p className="font-medium text-gray-900">{asset.name}</p><p className="text-xs text-gray-500">{asset.symbol || 'Tanpa simbol'} · {assetQuantitySummary(asset)}</p></td>
              <td className="py-2.5 px-3 text-sm text-gray-700">{assetTypeLabel(asset.asset_type)}</td>
              <td className="py-2.5 px-3 text-right text-sm"><p>{asset.currency === 'IDR' ? formatCurrency(asset.cost_basis) : formatAssetCurrency(asset.quantity * asset.average_price, asset.currency)}</p>{asset.currency !== 'IDR' && <p className="text-xs text-gray-500 mt-0.5">≈ {formatCurrency(asset.cost_basis)}</p>}</td>
              <td className="py-2.5 px-3 text-right font-medium"><p>{asset.currency === 'IDR' ? formatCurrency(asset.market_value) : formatAssetCurrency(asset.quantity * asset.current_price, asset.currency)}</p>{asset.currency !== 'IDR' && <p className="text-xs font-normal text-gray-500 mt-0.5">≈ {formatCurrency(asset.market_value)}</p>}</td>
              <td className={`py-2.5 px-3 text-right text-sm font-medium ${asset.unrealized_pl >= 0 ? 'text-green-600' : 'text-red-600'}`}><p>{asset.unrealized_pl >= 0 ? '+' : ''}{asset.currency === 'IDR' ? formatCurrency(asset.unrealized_pl) : formatAssetCurrency(asset.quantity * (asset.current_price - asset.average_price), asset.currency)}</p>{asset.currency !== 'IDR' && <p className="text-xs font-normal text-gray-500 mt-0.5">≈ {formatCurrency(asset.unrealized_pl)}</p>}</td>
              <td className="py-2.5 px-3"><div className="flex justify-end gap-2"><button onClick={() => openEditAsset(asset)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button><button onClick={() => deleteAsset(asset)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td>
              </tr>)}
              </Fragment>)}
            </tbody>
          </table>
        </div>
        {!assetLoading && portfolioAssetCount === 0 && <div className="text-center py-8"><p className="font-medium text-gray-700">Portofolio masih kosong</p><p className="text-sm text-gray-500 mt-1">Catat saham atau tambahkan instrumen investasi pertama Anda.</p></div>}
        {portfolioAssetCount > 6 && <div className="flex justify-center pt-4 mt-2 border-t border-gray-100"><button onClick={() => setShowAllPortfolioAssets((current) => !current)} className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg">{showAllPortfolioAssets ? 'Tampilkan lebih sedikit' : `Lihat semua ${portfolioAssetCount} aset`}</button></div>}
      </div>

      {/* Portfolio Summary Cards */}
      <div className="portfolio-summary-grid order-2 grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 min-w-0">
          <p className="text-sm text-gray-600 mb-1">Nilai Portofolio</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 break-words">{formatCurrency(portfolioMetrics.totalValue)}</p>
          <p className="text-xs text-gray-500 mt-1">Modal: {formatCurrency(portfolioMetrics.totalCost)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 min-w-0">
          <p className="text-sm text-gray-600 mb-1">Unrealized P/L</p>
          <p className={`text-lg sm:text-2xl font-bold break-words ${portfolioMetrics.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {portfolioMetrics.unrealizedPL >= 0 ? '+' : ''}
            {formatCurrency(portfolioMetrics.unrealizedPL)}
          </p>
          <p className={`text-xs mt-1 ${portfolioMetrics.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {portfolioMetrics.unrealizedPLPercent >= 0 ? '+' : ''}
            {portfolioMetrics.unrealizedPLPercent.toFixed(2)}%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 min-w-0">
          <p className="text-sm text-gray-600 mb-1">Realized P/L</p>
          <p className={`text-lg sm:text-2xl font-bold break-words ${portfolioMetrics.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {portfolioMetrics.realizedPL >= 0 ? '+' : ''}
            {formatCurrency(portfolioMetrics.realizedPL)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Dari transaksi jual</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 min-w-0">
          <p className="text-sm text-gray-600 mb-1">Total Dividen</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600 break-words">{formatCurrency(portfolioMetrics.totalDividends)}</p>
          <p className="text-xs text-gray-500 mt-1">{dividends.length} pembayaran</p>
        </div>
      </div>

      {/* Recent Transactions & Dividends */}
      <div className="order-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Riwayat Transaksi Saham</h3>
              <p className="text-sm text-gray-500">Urutan transaksi terbaru</p>
            </div>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">{transactionHistory.length} transaksi</span>
          </div>
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 420 }}>
            {transactionHistory.map((tx: any) => {
                const uiType = getTxUIType(tx);
                const lots = getTxLots(tx);
                const shares = getTxShares(tx);
                const pricePerShare = getTxPricePerShare(tx);
                const fee = getTxFee(tx);

                return (
                  <div key={tx.id} className="portfolio-history-row flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{tx.ticker}</span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            uiType === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {uiType === 'buy' ? 'BELI' : 'JUAL'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {lots} lot @ {formatCurrency(pricePerShare)}
                      </p>
                      <p className="text-xs text-gray-500">Tanggal: {new Date(tx.date).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(shares * pricePerShare + fee)}</p>
                      <p className="text-xs text-gray-500">{shares.toLocaleString('id-ID')} lembar</p>
                      <div className="mt-2 flex items-center justify-end gap-3">
                        <button type="button" onClick={() => openEditTransaction(tx)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800" title="Edit transaksi">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button type="button" onClick={() => handleDeleteTransaction(tx)} className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800" title="Hapus transaksi">
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            {stockTransactions.length === 0 && <p className="text-center text-gray-500 py-4">Belum ada transaksi</p>}
          </div>
        </div>

        {/* Dividends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Riwayat Dividen</h3>
              <p className="text-sm text-gray-500">Seluruh pendapatan dividen</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">{dividendHistory.length} pembayaran</span>
          </div>
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 420 }}>
            {dividendHistory.map((div: any) => {
                const total = getDividendTotal(div);
                const payment = getDividendPaymentDate(div);

                return (
                <div key={div.id} className="portfolio-history-row flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{div.ticker}</p>
                      <p className="text-xs text-gray-500">
                        Dibayar: {payment ? new Date(payment).toLocaleDateString('id-ID') : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(total)}</p>
                    </div>
                  </div>
                );
              })}
            {dividends.length === 0 && <p className="text-center text-gray-500 py-4">Belum ada dividen</p>}
          </div>
        </div>
      </div>

      {/* Generic asset modal */}
      {showAssetModal && (
        <div className="portfolio-form-overlay fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }} onClick={() => setShowAssetModal(false)} role="dialog" aria-modal="true">
          <div className="portfolio-form-dialog relative bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full p-4 sm:p-6 overflow-y-auto overscroll-contain max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]" onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setShowAssetModal(false)} className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 text-gray-500"><X className="w-5 h-5" /></button>
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
            <div className="sticky bottom-0 grid grid-cols-2 gap-2 mt-6 pt-3 pb-[max(0px,env(safe-area-inset-bottom))] bg-white"><button disabled={savingAsset} onClick={() => setShowAssetModal(false)} className="min-w-0 px-3 sm:px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg">Batal</button><button disabled={savingAsset} onClick={saveAsset} className="min-w-0 px-3 sm:px-4 py-2.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">{savingAsset ? 'Menyimpan…' : editingAssetId ? 'Simpan Perubahan' : 'Simpan Aset'}</button></div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div
          className="portfolio-form-overlay fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }}
          onClick={() => setShowAddTransaction(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="asset-modal-title"
        >
          <div className="portfolio-form-dialog relative bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full p-4 sm:p-6 max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto overscroll-contain" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setShowAddTransaction(false)} className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 text-gray-500 hover:text-gray-800" aria-label="Tutup popup catat aset">
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

            <div className="sticky bottom-0 grid grid-cols-2 gap-2 mt-6 pt-3 pb-[max(0px,env(safe-area-inset-bottom))] bg-white">
              <button
                type="button"
                onClick={() => { setShowAddTransaction(false); setEditingTransactionId(null); }}
                disabled={savingTransaction}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddTransaction}
                disabled={savingTransaction}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
          className="portfolio-form-overlay fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }}
          onClick={() => setShowAddDividend(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dividend-modal-title"
        >
          <div className="portfolio-form-dialog relative bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full p-4 sm:p-6 max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto overscroll-contain" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setShowAddDividend(false)} className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 text-gray-500 hover:text-gray-800" aria-label="Tutup popup dividen">
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

            <div className="sticky bottom-0 grid grid-cols-2 gap-2 mt-6 pt-3 pb-[max(0px,env(safe-area-inset-bottom))] bg-white">
              <button
                onClick={() => setShowAddDividend(false)}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleAddDividend}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Price Modal */}
      {showUpdatePrice && (
        <div className="portfolio-form-overlay fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ backgroundColor: 'rgba(17, 24, 39, 0.22)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }}>
          <div className="portfolio-form-dialog bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full p-4 sm:p-6 max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain">
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
            <div className="grid grid-cols-2 gap-2 mt-6 pb-[max(0px,env(safe-area-inset-bottom))]">
              <button
                onClick={() => setShowUpdatePrice(false)}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleUpdatePrice}
                className="min-w-0 px-3 sm:px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
