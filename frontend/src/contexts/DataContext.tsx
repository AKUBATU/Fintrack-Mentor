import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from 'react'
import { api, type InvestmentAssetResponse } from '../services/api'
import { useAuth } from './AuthContext'
import { toast } from 'sonner'

/* =====================================================
   Helpers
===================================================== */
function toNumber(input: any): number {
  if (typeof input === 'number') return input
  if (input == null) return NaN

  const s = String(input)
    .replace(/rp/gi, '')
    .replace(/\s+/g, '')
    .replace(/[.,]/g, '')
    .trim()

  if (!s) return NaN
  return Number(s)
}

function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function storageSet(key: string, val: any) {
  localStorage.setItem(key, JSON.stringify(val))
}

/* =====================================================
   Types
===================================================== */
export interface ExpenseTransaction {
  id: string
  transactionType: 'income' | 'expense'
  date: string
  amount: number
  category: string
  paymentMethod: string
  fundSource: string
  merchant: string
  notes: string
  predictedCategory?: string
  confidence?: number
  hasReceipt: boolean
}

type ExpenseInput = Omit<ExpenseTransaction, 'id' | 'hasReceipt'> & { receiptFile?: File }

export interface Budget {
  id: string
  category: string
  amount: number
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  fundSource: string
  referenceDate: string
}

export interface StockTransaction {
  id: string
  ticker: string
  type: 'BUY' | 'SELL'
  lots: number
  shares: number
  price: number // price per share
  date: string
}

export interface StockHolding {
  ticker: string
  shares: number
  lots: number
  avgPrice: number
  currentPrice: number
  marketValue: number
  unrealizedPL: number
  realizedPL: number
}

export interface DashboardHolding {
  ticker: string
  totalShares: number
  totalLots: number
  avgPrice: number
  currentPrice: number
  marketValue: number
  costBasis: number
  unrealizedPL: number
  unrealizedPLPercent: number
  realizedPL: number
}

export interface Dividend {
  id: string
  ticker: string
  amount: number
  recordDate: string
  paymentDate: string
}

export type InvestmentAsset = InvestmentAssetResponse

export interface DailyReportEntry {
  id: string
  date: string
  portfolioValue: number
  notes: string
  screenshotUrl?: string
}

export interface UserProfile {
  dcaStrategy: string
  dcaAmount: number
  dcaFrequency: 'weekly' | 'biweekly' | 'monthly'
  focusStocks: string[]
  compoundingDividends: boolean
  bonusWeekRule: string
  baseCurrency: 'IDR' | 'USD' | 'EUR'
  timezone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura'
  onboardingCompleted: boolean
}

export interface FundAccount {
  source: string
  name: string
  openingBalance: number
  balance: number
}

export interface FundTransfer {
  id: string
  fromSource: string
  toSource: string
  amount: number
  date: string
  notes: string
}

export interface TransactionCategory {
  id: string
  transactionType: 'income' | 'expense'
  name: string
}

const defaultUserProfile: UserProfile = {
  dcaStrategy: 'Belum diatur',
  dcaAmount: 0,
  dcaFrequency: 'weekly',
  focusStocks: [],
  compoundingDividends: false,
  bonusWeekRule: '',
  baseCurrency: 'IDR',
  timezone: 'Asia/Jakarta',
  onboardingCompleted: false,
}

interface DataContextType {
  accountDataLoading: boolean
  expenses: ExpenseTransaction[]
  budgets: Budget[]
  stockTransactions: StockTransaction[]
  stockHoldings: StockHolding[]
  holdings: DashboardHolding[]
  dividends: Dividend[]
  investmentAssets: InvestmentAsset[]
  dailyReports: DailyReportEntry[]
  userProfile: UserProfile
  fundAccounts: FundAccount[]
  fundTransfers: FundTransfer[]
  customCategories: TransactionCategory[]

  addExpense(expense: ExpenseInput): Promise<void>
  updateExpense(id: string, expense: ExpenseInput): Promise<void>
  deleteExpense(id: string): Promise<void>
  addBudget(budget: Omit<Budget, 'id'>): Promise<void>
  updateBudget(id: string, budget: Omit<Budget, 'id'>): Promise<void>
  deleteBudget(id: string): Promise<void>
  addStockTransaction(
    transaction: Omit<StockTransaction, 'id' | 'shares'> & { lots: number }
  ): Promise<void>
  updateStockTransaction(
    id: string,
    transaction: Omit<StockTransaction, 'id' | 'shares'> & { lots: number }
  ): Promise<void>
  deleteStockTransaction(id: string): Promise<void>
  addDividend(dividend: Omit<Dividend, 'id'>): Promise<void>
  updateDividend(id: string, dividend: Omit<Dividend, 'id'>): Promise<void>
  deleteDividend(id: string): Promise<void>
  addDailyReport(report: Omit<DailyReportEntry, 'id'>): Promise<void>

  updateHoldingPrice(ticker: string, price: number): Promise<void>
  refreshInvestmentAssets(): Promise<void>
  refreshCalculations(): void
  updateUserProfile(profile: UserProfile): Promise<void>
  updateFundAccount(source: string, data: { name: string; openingBalance: number }): Promise<void>
  createFundAccount(data: { name: string; openingBalance: number }): Promise<void>
  deleteFundAccount(source: string): Promise<void>
  addFundTransfer(transfer: Omit<FundTransfer, 'id'>): Promise<void>
  deleteFundTransfer(id: string): Promise<void>
  addCustomCategory(transactionType: 'income' | 'expense', name: string): Promise<void>
  deleteCustomCategory(id: string): Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

/* =====================================================
   Holdings Calculator
===================================================== */
function buildHoldingsFromTransactions(
  txs: StockTransaction[],
  prevHoldings: StockHolding[],
  persistedPrices: Record<string, number> = {},
): StockHolding[] {
  // map currentPrice dari holdings lama (biar gak reset ke 0)
  const prevPriceMap = new Map<string, number>()
  for (const h of prevHoldings) {
    prevPriceMap.set(h.ticker.toUpperCase(), Number(h.currentPrice) || 0)
  }

  // sort by date (FIFO-ish order)
  const sorted = [...txs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // inventory per ticker: shares & avg cost
  const inv = new Map<string, { shares: number; avg: number; realized: number }>()
  const latestPrice = new Map<string, number>()

  for (const t of sorted) {
    const ticker = String(t.ticker || '').toUpperCase()
    const type = String(t.type || '').toUpperCase()
    const shares = Number(t.shares) || Math.round((Number(t.lots) || 0) * 100)
    const price = Number(t.price) || 0

    if (!ticker || shares <= 0 || price <= 0) continue

    latestPrice.set(ticker, price)

    const cur = inv.get(ticker) || { shares: 0, avg: 0, realized: 0 }

    if (type === 'BUY') {
      const newShares = cur.shares + shares
      const newAvg =
        newShares > 0 ? ((cur.shares * cur.avg) + (shares * price)) / newShares : 0
      inv.set(ticker, { shares: newShares, avg: newAvg, realized: cur.realized })
    } else if (type === 'SELL') {
      // sell limited by available shares
      const sellShares = Math.min(cur.shares, shares)
      const pnl = (price - cur.avg) * sellShares
      inv.set(ticker, {
        shares: Math.max(0, cur.shares - sellShares),
        avg: cur.avg,
        realized: cur.realized + pnl,
      })
    }
  }

  const result: StockHolding[] = []
  for (const [ticker, v] of inv.entries()) {
    // Holdings hanya berisi posisi aktif. Profit/loss dari posisi yang sudah ditutup
    // tetap dihitung dari riwayat transaksi, bukan dipertahankan sebagai holding nol.
    if (v.shares <= 0) continue

    // Harga yang pernah diubah di sesi aktif dipertahankan. Setelah login/reload,
    // gunakan harga transaksi terakhir agar nilai aset tidak kembali menjadi Rp0.
    const currentPrice = persistedPrices[ticker] || prevPriceMap.get(ticker) || latestPrice.get(ticker) || v.avg
    const lots = Math.floor(v.shares / 100)
    const costBasis = v.shares * v.avg
    const marketValue = v.shares * currentPrice
    const unrealized = marketValue - costBasis

    result.push({
      ticker,
      shares: v.shares,
      lots,
      avgPrice: v.avg,
      currentPrice,
      marketValue,
      unrealizedPL: unrealized,
      realizedPL: v.realized,
    })
  }

  // sort A-Z ticker biar rapih
  result.sort((a, b) => a.ticker.localeCompare(b.ticker))
  return result
}

/* =====================================================
   Provider
===================================================== */
export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()

  const [accountDataLoading, setAccountDataLoading] = useState(false)
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [stockTransactions, setStockTransactions] =
    useState<StockTransaction[]>([])
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([])
  const [dividends, setDividends] = useState<Dividend[]>([])
  const [investmentAssets, setInvestmentAssets] = useState<InvestmentAsset[]>([])
  const [stockPrices, setStockPrices] = useState<Record<string, number>>({})
  const [dailyReports, setDailyReports] = useState<DailyReportEntry[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultUserProfile)
  const [fundAccounts, setFundAccounts] = useState<FundAccount[]>([])
  const [fundTransfers, setFundTransfers] = useState<FundTransfer[]>([])
  const [customCategories, setCustomCategories] = useState<TransactionCategory[]>([])

  /* ================= Load account data from backend ================= */
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setAccountDataLoading(false)
      setExpenses([])
      setBudgets([])
      setStockTransactions([])
      setStockHoldings([])
      setDividends([])
      setInvestmentAssets([])
      setStockPrices({})
      setDailyReports([])
      setFundAccounts([])
      setFundTransfers([])
      setCustomCategories([])
      return
    }

    const load = async () => {
      setAccountDataLoading(true)
      try {
        const data = await api.accountData()

      setExpenses(data.expenses.map((row) => ({
        id: String(row.id),
        date: row.date,
        amount: Number(row.amount),
        transactionType: row.transaction_type === 'income' ? 'income' : 'expense',
        category: row.category,
        paymentMethod: row.payment_method,
        fundSource: row.fund_source === 'cash' ? 'cash' : 'bank',
        merchant: row.merchant || '',
        notes: row.notes || '',
        predictedCategory: row.predicted_category || undefined,
        confidence: row.confidence ?? undefined,
        hasReceipt: Boolean(row.has_receipt),
      })))
      setBudgets(data.budgets.map((row) => ({
        id: String(row.id),
        category: row.category,
        amount: Number(row.amount),
        period: row.period,
        fundSource: row.fund_source,
        referenceDate: row.reference_date,
      })))
      setStockTransactions(data.transactions.map((row) => ({
        id: String(row.id),
        ticker: row.ticker,
        type: row.type,
        shares: Number(row.shares),
        lots: Number(row.shares) / 100,
        price: Number(row.price),
        date: row.date,
      })))
      setDividends(data.dividends.map((row) => ({
        id: String(row.id),
        ticker: row.ticker,
        amount: Number(row.amount),
        recordDate: row.record_date,
        paymentDate: row.payment_date,
      })))
      setDailyReports(data.reports.map((row) => ({
        id: String(row.id),
        date: row.date,
        portfolioValue: Number(row.portfolio_value),
        notes: row.notes || '',
        screenshotUrl: row.screenshot_url || undefined,
      })))
      setInvestmentAssets((data.investment_assets ?? []).map((row) => ({
        ...row,
        quantity: Number(row.quantity), average_price: Number(row.average_price),
        current_price: Number(row.current_price), exchange_rate_to_idr: Number(row.exchange_rate_to_idr),
        cost_basis: Number(row.cost_basis), market_value: Number(row.market_value),
        unrealized_pl: Number(row.unrealized_pl), unrealized_pl_percent: Number(row.unrealized_pl_percent),
      })))
      setStockPrices(data.stock_prices ?? {})
      const preferences = data.preferences
      let loadedProfile = preferences ? {
        dcaStrategy: preferences.dca_strategy,
        dcaAmount: Number(preferences.dca_amount),
        dcaFrequency: preferences.dca_frequency,
        focusStocks: preferences.focus_stocks ?? [],
        compoundingDividends: Boolean(preferences.compounding_dividends),
        bonusWeekRule: preferences.bonus_week_rule,
        baseCurrency: preferences.base_currency ?? 'IDR',
        timezone: preferences.timezone ?? 'Asia/Jakarta',
        onboardingCompleted: Boolean(preferences.onboarding_completed),
      } : defaultUserProfile
      if (!data.preferences_persisted) {
        const localProfile = { ...defaultUserProfile, ...storageGet(`userProfile:${user.id}`, loadedProfile) }
        loadedProfile = localProfile
        await api.updatePreferences({
          dca_strategy: localProfile.dcaStrategy, dca_amount: localProfile.dcaAmount,
          dca_frequency: localProfile.dcaFrequency, focus_stocks: localProfile.focusStocks,
          compounding_dividends: localProfile.compoundingDividends, bonus_week_rule: localProfile.bonusWeekRule,
          base_currency: localProfile.baseCurrency ?? 'IDR', timezone: localProfile.timezone ?? 'Asia/Jakarta',
          onboarding_completed: Boolean(localProfile.onboardingCompleted),
        })
      }
      setUserProfile(loadedProfile)
      setFundAccounts((data.fund_accounts ?? []).map((row) => ({
        source: row.source, name: row.name,
        openingBalance: Number(row.opening_balance), balance: Number(row.balance),
      })))
      setFundTransfers((data.fund_transfers ?? []).map((row) => ({
        id: String(row.id), fromSource: row.from_source, toSource: row.to_source,
        amount: Number(row.amount), date: row.date, notes: row.notes || '',
      })))
      setCustomCategories((data.custom_categories ?? []).map((row) => ({ id: String(row.id), transactionType: row.transaction_type, name: row.name })))
      } catch (error) {
        console.error('Failed to load account data:', error)
        toast.error('Data akun gagal dimuat. Silakan coba login kembali.')
      } finally {
        setAccountDataLoading(false)
      }
    }

    load().catch((error) => console.error('Failed to load account data:', error))
  }, [isAuthenticated, user?.id])

  /* ================= Auto rebuild holdings when transactions change ================= */
  useEffect(() => {
    setStockHoldings((prev) => buildHoldingsFromTransactions(stockTransactions, prev, stockPrices))
  }, [stockTransactions, stockPrices])

  /* ================= Dashboard Holdings ================= */
  const holdings = useMemo<DashboardHolding[]>(() => {
    return stockHoldings.map((h) => {
      const totalShares = h.shares || 0
      const totalLots = h.lots || Math.floor(totalShares / 100)
      const costBasis = totalShares * (h.avgPrice || 0)
      const marketValue = h.marketValue || totalShares * (h.currentPrice || 0)
      const unrealizedPL = marketValue - costBasis
      const unrealizedPLPercent =
        costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0

      return {
        ticker: h.ticker,
        totalShares,
        totalLots,
        avgPrice: h.avgPrice,
        currentPrice: h.currentPrice,
        marketValue,
        costBasis,
        unrealizedPL,
        unrealizedPLPercent,
        realizedPL: h.realizedPL || 0,
      }
    })
  }, [stockHoldings])

  /* ================= Add Stock Transaction ================= */
  const addStockTransaction = async (
    transaction: Omit<StockTransaction, 'id' | 'shares'> & { lots: number }
  ) => {
    const lotsNum = toNumber(transaction.lots)
    const priceNum = toNumber(transaction.price)

    if (!transaction.ticker?.trim()) throw new Error('Ticker wajib diisi')
    if (!Number.isFinite(lotsNum) || lotsNum <= 0) throw new Error('Lots harus > 0')
    if (!Number.isFinite(priceNum) || priceNum <= 0) throw new Error('Price harus > 0')

    const shares = Math.round(lotsNum * 100)

    const payload = {
      ticker: transaction.ticker.toUpperCase(),
      type: transaction.type,
      shares,
      price: priceNum,
      date: transaction.date,
    }

    if (isAuthenticated) {
      const created = await api.addTransaction(payload)
      setStockTransactions((prev) => [
        { ...transaction, shares, price: priceNum, id: String(created.id) },
        ...prev,
      ])
      return
    }

    setStockTransactions((prev) => [
      {
        ...transaction,
        shares,
        price: priceNum,
        id: Date.now().toString(),
      },
      ...prev,
    ])
  }

  const updateStockTransaction = async (
    id: string,
    transaction: Omit<StockTransaction, 'id' | 'shares'> & { lots: number }
  ) => {
    const lots = toNumber(transaction.lots)
    const price = toNumber(transaction.price)
    if (!transaction.ticker?.trim()) throw new Error('Ticker wajib diisi')
    if (!Number.isFinite(lots) || lots <= 0) throw new Error('Lots harus > 0')
    if (!Number.isFinite(price) || price <= 0) throw new Error('Price harus > 0')
    const shares = Math.round(lots * 100)
    const updated = await api.updateTransaction(Number(id), {
      ticker: transaction.ticker.toUpperCase(),
      type: transaction.type,
      shares,
      price,
      date: transaction.date,
    })
    setStockTransactions((items) => items.map((item) => item.id === id ? {
      id: String(updated.id), ticker: updated.ticker, type: updated.type,
      shares: Number(updated.shares), lots: Number(updated.shares) / 100,
      price: Number(updated.price), date: updated.date,
    } : item))
  }

  const deleteStockTransaction = async (id: string) => {
    await api.deleteTransaction(Number(id))
    setStockTransactions((items) => items.filter((item) => item.id !== id))
  }

  /* ================= Update Holding Price (INI FIX UTAMANYA) ================= */
  const updateHoldingPrice = async (ticker: string, price: number) => {
    const p = Number(price)
    const t = String(ticker || '').toUpperCase()

    if (!t) throw new Error('Ticker wajib diisi')
    if (!Number.isFinite(p) || p <= 0) throw new Error('Harga harus > 0')

    const updated = await api.updateStockPrice(t, p)
    setStockPrices((current) => ({ ...current, [updated.ticker]: Number(updated.price) }))
  }

  const refreshInvestmentAssets = async () => {
    const rows = await api.listInvestmentAssets()
    setInvestmentAssets(rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity), average_price: Number(row.average_price),
      current_price: Number(row.current_price), exchange_rate_to_idr: Number(row.exchange_rate_to_idr),
      cost_basis: Number(row.cost_basis), market_value: Number(row.market_value),
      unrealized_pl: Number(row.unrealized_pl), unrealized_pl_percent: Number(row.unrealized_pl_percent),
    })))
  }

  /* ================= Others ================= */
  const addExpense = async (e: ExpenseInput) => {
    const { receiptFile, ...payload } = e
    const created = await api.createExpense(payload)
    await refreshFundAccounts()
    let hasReceipt = false
    if (receiptFile) {
      try {
        await api.uploadReceipt(Number(created.id), receiptFile)
        hasReceipt = true
      } catch {
        setExpenses((p) => [{ ...payload, hasReceipt: false, id: String(created.id) }, ...p])
        throw new Error('Transaksi tersimpan, tetapi foto struk gagal diunggah')
      }
    }
    setExpenses((p) => [{ ...payload, hasReceipt, id: String(created.id) }, ...p])
  }

  const updateExpense = async (id: string, e: ExpenseInput) => {
    const { receiptFile, ...payload } = e
    await api.updateExpense(Number(id), payload)
    await refreshFundAccounts()
    if (receiptFile) {
      try {
        await api.uploadReceipt(Number(id), receiptFile)
      } catch {
        setExpenses((items) => items.map((item) => item.id === id ? { ...payload, id, hasReceipt: item.hasReceipt } : item))
        throw new Error('Transaksi diperbarui, tetapi foto struk gagal diunggah')
      }
    }
    setExpenses((items) => items.map((item) => item.id === id
      ? { ...payload, id, hasReceipt: receiptFile ? true : item.hasReceipt }
      : item))
  }

  const deleteExpense = async (id: string) => {
    await api.deleteExpense(Number(id))
    setExpenses((items) => items.filter((item) => item.id !== id))
    await refreshFundAccounts()
  }

  const addBudget = async (b: Omit<Budget, 'id'>) => {
    const created = await api.createBudget(b)
    setBudgets((p) => [{ ...b, id: String(created.id) }, ...p])
  }

  const updateBudget = async (id: string, b: Omit<Budget, 'id'>) => {
    await api.updateBudget(Number(id), b)
    setBudgets((items) => items.map((item) => item.id === id ? { ...b, id } : item))
  }

  const deleteBudget = async (id: string) => {
    await api.deleteBudget(Number(id))
    setBudgets((items) => items.filter((item) => item.id !== id))
  }

  const addDividend = async (d: Omit<Dividend, 'id'>) => {
    const created = await api.addDividend(d)
    setDividends((p) => [{ ...d, id: String(created.id) }, ...p])
  }

  const updateDividend = async (id: string, d: Omit<Dividend, 'id'>) => {
    await api.updateDividend(Number(id), d)
    setDividends((items) => items.map((item) => item.id === id ? { ...d, id } : item))
  }

  const deleteDividend = async (id: string) => {
    await api.deleteDividend(Number(id))
    setDividends((items) => items.filter((item) => item.id !== id))
  }

  const addDailyReport = async (r: Omit<DailyReportEntry, 'id'>) => {
    const created = await api.addReport(r)
    setDailyReports((p) => [{ ...r, id: String(created.id) }, ...p])
  }

  const updateUserProfile = async (profile: UserProfile) => {
    await api.updatePreferences({
      dca_strategy: profile.dcaStrategy, dca_amount: profile.dcaAmount,
      dca_frequency: profile.dcaFrequency, focus_stocks: profile.focusStocks,
      compounding_dividends: profile.compoundingDividends, bonus_week_rule: profile.bonusWeekRule,
      base_currency: profile.baseCurrency, timezone: profile.timezone,
      onboarding_completed: profile.onboardingCompleted,
    })
    setUserProfile(profile)
    if (user) storageSet(`userProfile:${user.id}`, profile)
  }

  const refreshFundAccounts = async () => {
    const rows = await api.listFundAccounts()
    setFundAccounts(rows.map((row) => ({ source: row.source, name: row.name, openingBalance: Number(row.opening_balance), balance: Number(row.balance) })))
  }

  const updateFundAccount = async (source: string, data: { name: string; openingBalance: number }) => {
    await api.updateFundAccount(source, { name: data.name, opening_balance: data.openingBalance })
    await refreshFundAccounts()
  }

  const createFundAccount = async (data: { name: string; openingBalance: number }) => {
    await api.createFundAccount({ name: data.name, opening_balance: data.openingBalance })
    await refreshFundAccounts()
  }

  const deleteFundAccount = async (source: string) => {
    await api.deleteFundAccount(source)
    await refreshFundAccounts()
  }

  const addFundTransfer = async (transfer: Omit<FundTransfer, 'id'>) => {
    const created = await api.addFundTransfer({
      from_source: transfer.fromSource, to_source: transfer.toSource,
      amount: transfer.amount, date: transfer.date, notes: transfer.notes,
    })
    setFundTransfers((items) => [{ id: String(created.id), ...transfer }, ...items])
    await refreshFundAccounts()
  }

  const deleteFundTransfer = async (id: string) => {
    await api.deleteFundTransfer(Number(id))
    setFundTransfers((items) => items.filter((item) => item.id !== id))
    await refreshFundAccounts()
  }

  const addCustomCategory = async (transactionType: 'income' | 'expense', name: string) => {
    const created = await api.createTransactionCategory({ transaction_type: transactionType, name })
    setCustomCategories((items) => [...items, { id: String(created.id), transactionType: created.transaction_type, name: created.name }].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const deleteCustomCategory = async (id: string) => {
    await api.deleteTransactionCategory(Number(id))
    setCustomCategories((items) => items.filter((item) => item.id !== id))
  }

  const refreshCalculations = () => {
    setStockHoldings((prev) => buildHoldingsFromTransactions(stockTransactions, prev, stockPrices))
  }

  return (
    <DataContext.Provider
      value={{
        accountDataLoading,
        expenses,
        budgets,
        stockTransactions,
        stockHoldings,
        holdings,
        dividends,
        investmentAssets,
        dailyReports,
        userProfile,
        fundAccounts,
        fundTransfers,
        customCategories,
        addExpense,
        updateExpense,
        deleteExpense,
        addBudget,
        updateBudget,
        deleteBudget,
        addStockTransaction,
        updateStockTransaction,
        deleteStockTransaction,
        addDividend,
        updateDividend,
        deleteDividend,
        addDailyReport,
        updateHoldingPrice,
        refreshInvestmentAssets,
        refreshCalculations,
        updateUserProfile,
        updateFundAccount,
        createFundAccount,
        deleteFundAccount,
        addFundTransfer,
        deleteFundTransfer,
        addCustomCategory,
        deleteCustomCategory,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

/* =====================================================
   Hook
===================================================== */
export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
