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
  date: string
  amount: number
  category: string
  paymentMethod: string
  merchant: string
  notes: string
  predictedCategory?: string
  confidence?: number
}

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

interface DataContextType {
  expenses: ExpenseTransaction[]
  budgets: Budget[]
  stockTransactions: StockTransaction[]
  stockHoldings: StockHolding[]
  holdings: DashboardHolding[]
  dividends: Dividend[]
  dailyReports: DailyReportEntry[]
  userProfile: UserProfile

  addExpense(expense: Omit<ExpenseTransaction, 'id'>): Promise<void>
  addBudget(budget: Omit<Budget, 'id'>): Promise<void>
  addStockTransaction(
    transaction: Omit<StockTransaction, 'id' | 'shares'> & { lots: number }
  ): Promise<void>
  addDividend(dividend: Omit<Dividend, 'id'>): Promise<void>
  addDailyReport(report: Omit<DailyReportEntry, 'id'>): Promise<void>

  updateHoldingPrice(ticker: string, price: number): void
  refreshCalculations(): void
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

  for (const t of sorted) {
    const ticker = String(t.ticker || '').toUpperCase()
    const type = String(t.type || '').toUpperCase()
    const shares = Number(t.shares) || Math.round((Number(t.lots) || 0) * 100)
    const price = Number(t.price) || 0

    if (!ticker || shares <= 0 || price <= 0) continue

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
    // hanya tampilkan yang masih ada shares (kalau kamu mau tetap tampil walau 0 shares, tinggal hapus if ini)
    if (v.shares <= 0 && Math.abs(v.realized) < 1e-9) continue

    const currentPrice = prevPriceMap.get(ticker) ?? 0
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
  const { isAuthenticated } = useAuth()

  const [expenses, setExpenses] = useState<ExpenseTransaction[]>(() =>
    storageGet('expenses', [])
  )
  const [budgets, setBudgets] = useState<Budget[]>(() =>
    storageGet('budgets', [])
  )
  const [stockTransactions, setStockTransactions] =
    useState<StockTransaction[]>(() => storageGet('stockTransactions', []))
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>(() =>
    storageGet('stockHoldings', [])
  )
  const [dividends, setDividends] = useState<Dividend[]>(() =>
    storageGet('dividends', [])
  )
  const [dailyReports, setDailyReports] = useState<DailyReportEntry[]>(() =>
    storageGet('dailyReports', [])
  )
  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    storageGet('userProfile', {
      dcaStrategy: 'Balanced',
      dcaAmount: 500000,
      dcaFrequency: 'weekly',
      focusStocks: ['BBRI', 'BMRI'],
      compoundingDividends: true,
      bonusWeekRule: 'Jika ada bonus, tambah 1x DCA',
    })
  )

  /* ================= Persist to localStorage ================= */
  useEffect(() => storageSet('expenses', expenses), [expenses])
  useEffect(() => storageSet('budgets', budgets), [budgets])
  useEffect(() => storageSet('stockTransactions', stockTransactions), [stockTransactions])
  useEffect(() => storageSet('stockHoldings', stockHoldings), [stockHoldings])
  useEffect(() => storageSet('dividends', dividends), [dividends])
  useEffect(() => storageSet('dailyReports', dailyReports), [dailyReports])
  useEffect(() => storageSet('userProfile', userProfile), [userProfile])

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
  const addExpense = async (e: Omit<ExpenseTransaction, 'id'>) =>
    setExpenses((p) => [{ ...e, id: Date.now().toString() }, ...p])

  const addBudget = async (b: Omit<Budget, 'id'>) =>
    setBudgets((p) => [{ ...b, id: Date.now().toString() }, ...p])

  const addDividend = async (d: Omit<Dividend, 'id'>) =>
    setDividends((p) => [{ ...d, id: Date.now().toString() }, ...p])

  const addDailyReport = async (r: Omit<DailyReportEntry, 'id'>) =>
    setDailyReports((p) => [{ ...r, id: Date.now().toString() }, ...p])

  const refreshCalculations = () => {
    setStockHoldings((prev) => buildHoldingsFromTransactions(stockTransactions, prev))
  }

  return (
    <DataContext.Provider
      value={{
        expenses,
        budgets,
        stockTransactions,
        stockHoldings,
        holdings,
        dividends,
        dailyReports,
        userProfile,
        addExpense,
        addBudget,
        addStockTransaction,
        addDividend,
        addDailyReport,
        updateHoldingPrice,
        refreshCalculations,
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
