import { useEffect, useMemo, useState } from 'react'
import { useData } from '../contexts/DataContext'
import { api } from '../services/api'
import { TrendingUp, TrendingDown, Wallet, PieChart, DollarSign, AlertCircle } from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function Dashboard() {
  const { accountDataLoading, expenses, holdings, budgets } = useData()
  const [investmentAssets, setInvestmentAssets] = useState<any[]>([])
  const [investmentAssetsLoading, setInvestmentAssetsLoading] = useState(true)

  useEffect(() => {
    let active = true
    setInvestmentAssetsLoading(true)
    api.listInvestmentAssets()
      .then((assets) => { if (active) setInvestmentAssets(assets) })
      .catch((error) => console.error('Failed to load dashboard investment assets:', error))
      .finally(() => { if (active) setInvestmentAssetsLoading(false) })
    return () => { active = false }
  }, [])

  const portfolioLoading = accountDataLoading || investmentAssetsLoading

  // Calculate metrics
  const metrics = useMemo(() => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const monthlyExpenses = (expenses ?? []).filter((e) => {
      const date = new Date(e.date)
      return e.transactionType !== 'income' && date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })

    const totalExpenses = (expenses ?? [])
      .filter((e) => e.transactionType !== 'income')
      .reduce((sum, e) => sum + e.amount, 0)
    const totalIncome = (expenses ?? [])
      .filter((e) => e.transactionType === 'income')
      .reduce((sum, e) => sum + e.amount, 0)
    const currentMonthExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0)

    const stockPortfolioValue = (holdings ?? []).reduce((sum, h) => sum + (h.marketValue ?? 0), 0)
    const stockTotalCost = (holdings ?? []).reduce((sum, h) => sum + (h.costBasis ?? 0), 0)
    const otherPortfolioValue = investmentAssets.reduce((sum, asset) => sum + Number(asset.market_value || 0), 0)
    const otherTotalCost = investmentAssets.reduce((sum, asset) => sum + Number(asset.cost_basis || 0), 0)
    const portfolioValue = stockPortfolioValue + otherPortfolioValue
    const totalCost = stockTotalCost + otherTotalCost
    const unrealizedPL = portfolioValue - totalCost
    const unrealizedPLPercent = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0

    // Budget tracking
    const totalBudget = (budgets ?? []).reduce((sum, b) => sum + b.amount, 0)
    const budgetUsage = totalBudget > 0 ? (currentMonthExpenses / totalBudget) * 100 : 0

    return {
      totalExpenses,
      totalIncome,
      cashFlowBalance: totalIncome - totalExpenses,
      portfolioValue,
      unrealizedPL,
      unrealizedPLPercent,
      totalBudget,
      budgetUsage,
    }
  }, [expenses, holdings, budgets, investmentAssets])

  // Expense by category
  const expenseByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>()
    ;(expenses ?? []).forEach((e) => {
      if (e.transactionType !== 'income') {
        categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount)
      }
    })

    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }))
  }, [expenses])

  // Expense trend (last 7 days)
  const expenseTrend = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date
    })

    return last7Days.map((date) => {
      const dateStr = date.toISOString().split('T')[0]
      const dayExpenses = (expenses ?? []).filter((e) => e.transactionType !== 'income' && e.date === dateStr)
      const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0)

      return {
        date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        amount: total,
      }
    })
  }, [expenses])

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Ringkasan keuangan & portofolio Anda</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Wallet className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Pengeluaran</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalExpenses)}</p>
          <div className="mt-2">
            <div className="flex items-center text-sm">
              <span className="text-gray-600">Budget bulan ini: {formatCurrency(metrics.totalBudget)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${metrics.budgetUsage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(metrics.budgetUsage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="p-2 bg-green-100 rounded-lg w-fit mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Pemasukan</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalIncome)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className={`p-2 rounded-lg w-fit mb-4 ${metrics.cashFlowBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <Wallet className={`w-6 h-6 ${metrics.cashFlowBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <p className="text-sm text-gray-600 mb-1">Saldo Arus Kas Keseluruhan</p>
          <p className={`text-2xl font-bold ${metrics.cashFlowBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(metrics.cashFlowBalance)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PieChart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Nilai Portofolio</p>
          {portfolioLoading
            ? <div className="mt-2 h-8 w-40 animate-pulse rounded bg-gray-100" />
            : <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.portfolioValue)}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-lg ${metrics.unrealizedPL >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {metrics.unrealizedPL >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Unrealized P/L</p>
          {portfolioLoading ? <div className="mt-2 space-y-2"><div className="h-8 w-40 animate-pulse rounded bg-gray-100" /><div className="h-4 w-16 animate-pulse rounded bg-gray-100" /></div> : <>
            <p className={`text-2xl font-bold ${metrics.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.unrealizedPL)}
            </p>
            <p className={`text-sm mt-1 ${metrics.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.unrealizedPLPercent > 0 ? '+' : ''}
              {metrics.unrealizedPLPercent.toFixed(2)}%
            </p>
          </>}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Holdings</p>
          <p className="text-2xl font-bold text-gray-900">{(holdings ?? []).length}</p>
          <p className="text-sm text-gray-600 mt-1">Saham aktif</p>
        </div>
      </div>

      {/* Budget Alert */}
      {metrics.budgetUsage > 80 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">Perhatian Budget!</p>
            <p className="text-sm text-yellow-700 mt-1">
              Anda telah menggunakan {metrics.budgetUsage.toFixed(1)}% dari budget bulanan.
            </p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Tren Pengeluaran (7 Hari)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={expenseTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="amount" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense by Category */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Pengeluaran per Kategori (Keseluruhan)</h3>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPie>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </RechartsPie>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500">Belum ada data pengeluaran</div>
          )}
        </div>
      </div>

      {/* Holdings Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Top Holdings</h3>
        <div className="space-y-3">
          {(holdings ?? []).slice(0, 5).map((holding) => (
            <div key={holding.ticker} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{holding.ticker}</p>
                <p className="text-sm text-gray-600">
                  {holding.totalLots} lot ({holding.totalShares} lembar)
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{formatCurrency(holding.marketValue)}</p>
                <p className={`text-sm ${holding.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {holding.unrealizedPL >= 0 ? '+' : ''}
                  {formatCurrency(holding.unrealizedPL)} ({holding.unrealizedPLPercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          ))}
          {(holdings ?? []).length === 0 && <p className="text-gray-500 text-center py-4">Belum ada holdings</p>}
        </div>
      </div>
    </div>
  )
}
