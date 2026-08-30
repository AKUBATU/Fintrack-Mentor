import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from 'react'
import { api } from '../services/api'
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
  period: 'monthly' | 'weekly'
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
}

const defaultUserProfile: UserProfile = {
  dcaStrategy: 'Balanced',
  dcaAmount: 500000,
  dcaFrequency: 'weekly',
  focusStocks: ['BBRI', 'BMRI'],
  compoundingDividends: true,
  bonusWeekRule: 'Jika ada bonus, tambah 1x DCA',
}

interface DataContextType {
  accountDataLoading: boolean
  expenses: ExpenseTransaction[]
  budgets: Budget[]
  stockTransactions: StockTransaction[]
  stockHoldings: StockHolding[]
  holdings: DashboardHolding[]
  dividends: Dividend[]
  dailyReports: DailyReportEntry[]
  userProfile: UserProfile

  addExpense(expense: ExpenseInput): Promise<void>
  updateExpense(id: string, expense: ExpenseInput): Promise<void>
  deleteExpense(id: string): Promise<void>
  addBudget(budget: Omit<Budget, 'id'>): Promise<void>
  addStockTransaction(
    transaction: Omit<StockTransaction, 'id' | 'shares'> & { lots: number }
  ): Promise<void>
  updateStockTransaction(
    id: string,
    transaction: Omit<StockTransaction, 'id' | 'shares'> & { lots: number }
  ): Promise<void>
  deleteStockTransaction(id: string): Promise<void>
  addDividend(dividend: Omit<Dividend, 'id'>): Promise<void>
  addDailyReport(report: Omit<DailyReportEntry, 'id'>): Promise<void>

  updateHoldingPrice(ticker: string, price: number): void
  refreshCalculations(): void
  updateUserProfile(profile: UserProfile): void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

/* =====================================================
   Holdings Calculator
===================================================== */
function buildHoldingsFromTransactions(
  txs: StockTransaction[],
  prevHoldings: StockHolding[]
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
    const currentPrice = prevPriceMap.get(ticker) || latestPrice.get(ticker) || v.avg
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
  const [dailyReports, setDailyReports] = useState<DailyReportEntry[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultUserProfile)

  /* ================= Load account data from backend ================= */
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setAccountDataLoading(false)
      setExpenses([])
      setBudgets([])
      setStockTransactions([])
      setStockHoldings([])
      setDividends([])
      setDailyReports([])
      return
    }

    const load = async () => {
      setAccountDataLoading(true)
      try {
        const results = await Promise.allSettled([
          api.listExpenses(),
          api.listBudgets(),
          api.listTransactions(),
          api.listDividends(),
          api.listReports(),
        ])

        const [expenseResult, budgetResult, transactionResult, dividendResult, reportResult] = results

      if (expenseResult.status === 'fulfilled') setExpenses(expenseResult.value.map((row) => ({
        id: String(row.id),
        date: row.date,
        amount: Number(row.amount),
        transactionType: row.transaction_type === 'income' ? 'income' : 'expense',
        category: row.category,
        paymentMethod: row.payment_method,
        merchant: row.merchant || '',
        notes: row.notes || '',
        predictedCategory: row.predicted_category || undefined,
        confidence: row.confidence ?? undefined,
        hasReceipt: Boolean(row.has_receipt),
      })))
      if (budgetResult.status === 'fulfilled') setBudgets(budgetResult.value.map((row) => ({
        id: String(row.id),
        category: row.category,
        amount: Number(row.amount),
        period: row.period,
      })))
      if (transactionResult.status === 'fulfilled') setStockTransactions(transactionResult.value.map((row) => ({
        id: String(row.id),
        ticker: row.ticker,
        type: row.type,
        shares: Number(row.shares),
        lots: Number(row.shares) / 100,
        price: Number(row.price),
        date: row.date,
      })))
      if (dividendResult.status === 'fulfilled') setDividends(dividendResult.value.map((row) => ({
        id: String(row.id),
        ticker: row.ticker,
        amount: Number(row.amount),
        recordDate: row.record_date,
        paymentDate: row.payment_date,
      })))
      if (reportResult.status === 'fulfilled') setDailyReports(reportResult.value.map((row) => ({
        id: String(row.id),
        date: row.date,
        portfolioValue: Number(row.portfolio_value),
        notes: row.notes || '',
        screenshotUrl: row.screenshot_url || undefined,
      })))

        const failures = results.filter((result) => result.status === 'rejected')
        if (failures.length > 0) {
          console.error('Failed account data requests:', failures)
          toast.error(`${failures.length} bagian data gagal dimuat. Silakan coba login kembali.`)
        }
      } finally {
        setAccountDataLoading(false)
      }
    }

    load().catch((error) => console.error('Failed to load account data:', error))
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (!user) return
    setUserProfile(storageGet(`userProfile:${user.id}`, defaultUserProfile))
  }, [user?.id])

  /* ================= Auto rebuild holdings when transactions change ================= */
  useEffect(() => {
    setStockHoldings((prev) => buildHoldingsFromTransactions(stockTransactions, prev))
  }, [stockTransactions])

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
  const updateHoldingPrice = (ticker: string, price: number) => {
    const p = Number(price)
    const t = String(ticker || '').toUpperCase()

    if (!t) throw new Error('Ticker wajib diisi')
    if (!Number.isFinite(p) || p <= 0) throw new Error('Harga harus > 0')

    setStockHoldings((prev) =>
      prev.map((h) => {
        if (h.ticker.toUpperCase() !== t) return h
        const shares = h.shares || 0
        const costBasis = shares * (h.avgPrice || 0)
        const marketValue = shares * p
        const unreal = marketValue - costBasis
        return {
          ...h,
          ticker: t,
          currentPrice: p,
          marketValue,
          unrealizedPL: unreal,
        }
      })
    )
  }

  /* ================= Others ================= */
  const addExpense = async (e: ExpenseInput) => {
    const { receiptFile, ...payload } = e
    const created = await api.createExpense(payload)
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
  }

  const addBudget = async (b: Omit<Budget, 'id'>) => {
    const created = await api.createBudget(b)
    setBudgets((p) => [{ ...b, id: String(created.id) }, ...p])
  }

  const addDividend = async (d: Omit<Dividend, 'id'>) => {
    const created = await api.addDividend(d)
    setDividends((p) => [{ ...d, id: String(created.id) }, ...p])
  }

  const addDailyReport = async (r: Omit<DailyReportEntry, 'id'>) => {
    const created = await api.addReport(r)
    setDailyReports((p) => [{ ...r, id: String(created.id) }, ...p])
  }

  const updateUserProfile = (profile: UserProfile) => {
    setUserProfile(profile)
    if (user) storageSet(`userProfile:${user.id}`, profile)
  }

  const refreshCalculations = () => {
    setStockHoldings((prev) => buildHoldingsFromTransactions(stockTransactions, prev))
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
        dailyReports,
        userProfile,
        addExpense,
        updateExpense,
        deleteExpense,
        addBudget,
        addStockTransaction,
        updateStockTransaction,
        deleteStockTransaction,
        addDividend,
        addDailyReport,
        updateHoldingPrice,
        refreshCalculations,
        updateUserProfile,
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
