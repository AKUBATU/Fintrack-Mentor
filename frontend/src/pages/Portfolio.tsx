import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function Portfolio() {
  // ✅ ambil context apa adanya (tetap), tapi kita bikin aman kalau ada field yang belum disediakan
  const data: any = useData();

  const stockTransactions = (data?.stockTransactions ?? []) as any[];
  const holdings = (data?.holdings ?? []) as any[];
  const dividends = (data?.dividends ?? []) as any[];

  const addStockTransaction = data?.addStockTransaction as undefined | ((payload: any) => Promise<void>);
  const addDividend = data?.addDividend as undefined | ((payload: any) => Promise<void>);

  // ✅ ini yang bikin error kamu: kalau context belum punya, dia undefined → kita guard biar nggak crash
  const updateHoldingPrice =
    typeof data?.updateHoldingPrice === 'function' ? (data.updateHoldingPrice as (ticker: string, price: number) => void) : undefined;

  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddDividend, setShowAddDividend] = useState(false);
  const [showUpdatePrice, setShowUpdatePrice] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState('');

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

  // ======================
  // Portfolio metrics (tetap layout sama)
  // ======================
  const portfolioMetrics = useMemo(() => {
    const totalValue = holdings.reduce((sum: number, h: any) => sum + (num(h?.marketValue) || 0), 0);
    const totalCost = holdings.reduce((sum: number, h: any) => sum + (num(h?.costBasis) || 0), 0);

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
  }, [holdings, dividends, stockTransactions]);

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

    if (!addStockTransaction) {
      toast.error('addStockTransaction belum tersedia di DataContext');
      return;
    }

    try {
      // ✅ DataContext expects: { ticker, type: 'BUY'|'SELL', lots, price, date }
      await addStockTransaction({
        ticker,
        type: transactionForm.type === 'buy' ? 'BUY' : 'SELL',
        lots: lotsNum,
        price: priceNum,
        date: transactionForm.date
      });

      toast.success(`Transaksi ${transactionForm.type} berhasil ditambahkan!`);
      setShowAddTransaction(false);
      setTransactionForm({
        ticker: '',
        type: 'buy',
        date: new Date().toISOString().split('T')[0],
        lots: '',
        pricePerShare: '',
        fee: ''
      });
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menambahkan transaksi');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portofolio Saham</h1>
          <p className="text-gray-600">Kelola investasi & dividen Anda</p>
        </div>
        <div className="flex gap-2">
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
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Transaksi
          </button>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Nilai Portofolio</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(portfolioMetrics.totalValue)}</p>
          <p className="text-xs text-gray-500 mt-1">Modal: {formatCurrency(portfolioMetrics.totalCost)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Unrealized P/L</p>
          <p className={`text-2xl font-bold ${portfolioMetrics.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {portfolioMetrics.unrealizedPL >= 0 ? '+' : ''}
            {formatCurrency(portfolioMetrics.unrealizedPL)}
          </p>
          <p className={`text-xs mt-1 ${portfolioMetrics.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {portfolioMetrics.unrealizedPLPercent >= 0 ? '+' : ''}
            {portfolioMetrics.unrealizedPLPercent.toFixed(2)}%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Realized P/L</p>
          <p className={`text-2xl font-bold ${portfolioMetrics.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {portfolioMetrics.realizedPL >= 0 ? '+' : ''}
            {formatCurrency(portfolioMetrics.realizedPL)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Dari transaksi jual</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Dividen</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(portfolioMetrics.totalDividends)}</p>
          <p className="text-xs text-gray-500 mt-1">{dividends.length} pembayaran</p>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Holdings</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Ticker</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Lot</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Lembar</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Avg Price</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Current</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Market Value</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">P/L</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding: any) => (
                  <tr key={holding.ticker} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{holding.ticker}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">{holding.totalLots}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{holding.totalShares}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(num(holding.avgPrice) || 0)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(num(holding.currentPrice) || 0)}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">{formatCurrency(num(holding.marketValue) || 0)}</td>
                    <td className={`py-3 px-4 text-right font-medium ${num(holding.unrealizedPL) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div>
                        {num(holding.unrealizedPL) >= 0 ? '+' : ''}
                        {formatCurrency(num(holding.unrealizedPL) || 0)}
                      </div>
                      <div className="text-xs">
                        ({num(holding.unrealizedPLPercent) >= 0 ? '+' : ''}
                        {(num(holding.unrealizedPLPercent) || 0).toFixed(2)}%)
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {holdings.length === 0 && <p className="text-center text-gray-500 py-8">Belum ada holdings</p>}
          </div>
        </div>
      </div>

      {/* Recent Transactions & Dividends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Transaksi Terakhir</h3>
          <div className="space-y-3">
            {stockTransactions
              .slice()
              .reverse()
              .slice(0, 5)
              .map((tx: any) => {
                const uiType = getTxUIType(tx);
                const lots = getTxLots(tx);
                const shares = getTxShares(tx);
                const pricePerShare = getTxPricePerShare(tx);
                const fee = getTxFee(tx);

                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{tx.ticker}</span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            uiType === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {uiType.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {lots} lot @ {formatCurrency(pricePerShare)}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(shares * pricePerShare + fee)}</p>
                      <p className="text-xs text-gray-500">Fee: {formatCurrency(fee)}</p>
                    </div>
                  </div>
                );
              })}
            {stockTransactions.length === 0 && <p className="text-center text-gray-500 py-4">Belum ada transaksi</p>}
          </div>
        </div>

        {/* Dividends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Dividen</h3>
          <div className="space-y-3">
            {dividends
              .slice()
              .reverse()
              .slice(0, 5)
              .map((div: any) => {
                const total = getDividendTotal(div);
                const payment = getDividendPaymentDate(div);

                return (
                  <div key={div.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{div.ticker}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(total)}</p>
                      <p className="text-xs text-gray-500">
                        Payment: {payment ? new Date(payment).toLocaleDateString('id-ID') : '-'}
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

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Tambah Transaksi</h3>
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
                onClick={() => setShowAddTransaction(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleAddTransaction}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Dividend Modal */}
      {showAddDividend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Catat Dividen</h3>
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
