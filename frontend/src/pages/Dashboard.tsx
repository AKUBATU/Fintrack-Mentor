import { useMemo, useState } from 'react'
import { useData } from '../contexts/DataContext'
import { TrendingUp, TrendingDown, Wallet, PieChart, DollarSign, AlertCircle, CalendarDays } from 'lucide-react'
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
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '../utils/formatters'
import { Link } from 'react-router-dom'

const getLocalDateValue = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isInBudgetPeriod = (dateValue: string, referenceDateValue: string, period: string) => {
  const date = new Date(`${dateValue}T00:00:00`)
  const referenceDate = new Date(`${referenceDateValue}T00:00:00`)
  if (period === 'daily') return dateValue === referenceDateValue
  if (period === 'weekly') {
    const weekStart = (value: Date) => {
      const start = new Date(value)
      start.setDate(value.getDate() - ((value.getDay() + 6) % 7))
      return start.getTime()
    }
    return weekStart(date) === weekStart(referenceDate)
  }
  if (period === 'yearly') return date.getFullYear() === referenceDate.getFullYear()
  return date.getMonth() === referenceDate.getMonth() && date.getFullYear() === referenceDate.getFullYear()
}

export default function Dashboard() {
  const { accountDataLoading, expenses, holdings, budgets, investmentAssets, userProfile } = useData()
  const portfolioLoading = accountDataLoading
  const currentMonth = getLocalDateValue().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const selectedMonthLabel = new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })
  const monthlyExpenses = useMemo(
    () => (expenses ?? []).filter((expense) => expense.date.startsWith(selectedMonth)),
    [expenses, selectedMonth],
  )

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalExpenses = monthlyExpenses
      .filter((e) => e.transactionType !== 'income')
      .reduce((sum, e) => sum + e.amount, 0)
    const totalIncome = monthlyExpenses
      .filter((e) => e.transactionType === 'income')
      .reduce((sum, e) => sum + e.amount, 0)
    const stockPortfolioValue = (holdings ?? []).reduce((sum, h) => sum + (h.marketValue ?? 0), 0)
    const stockTotalCost = (holdings ?? []).reduce((sum, h) => sum + (h.costBasis ?? 0), 0)
    const otherPortfolioValue = investmentAssets.reduce((sum, asset) => sum + Number(asset.market_value || 0), 0)
    const otherTotalCost = investmentAssets.reduce((sum, asset) => sum + Number(asset.cost_basis || 0), 0)
    const portfolioValue = stockPortfolioValue + otherPortfolioValue
    const totalCost = stockTotalCost + otherTotalCost
    const unrealizedPL = portfolioValue - totalCost
    const unrealizedPLPercent = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0

    // A monthly dashboard only compares spending with a monthly budget. Daily,
    // weekly, and yearly limits remain available in the detailed Finance page.
    const monthlyBudgets = (budgets ?? []).filter((budget) =>
      budget.period === 'monthly' && (budget.referenceDate || '').startsWith(selectedMonth)
    )
    const activeBudget = monthlyBudgets.find((budget) => budget.category === 'Keseluruhan') ?? monthlyBudgets[0]
    const budgetSpent = activeBudget
      ? monthlyExpenses
          .filter((expense) => expense.transactionType !== 'income'
            && (activeBudget.category === 'Keseluruhan' || expense.category === activeBudget.category)
            && (activeBudget.fundSource === 'all' || expense.fundSource === activeBudget.fundSource)
            && isInBudgetPeriod(expense.date, activeBudget.referenceDate, activeBudget.period))
          .reduce((sum, expense) => sum + expense.amount, 0)
      : 0
    const totalBudget = activeBudget?.amount ?? 0
    const budgetUsage = totalBudget > 0 ? (budgetSpent / totalBudget) * 100 : 0
    const budgetPeriodLabel = activeBudget ? selectedMonthLabel : ''

    return {
      totalExpenses,
      totalIncome,
      cashFlowBalance: totalIncome - totalExpenses,
      portfolioValue,
      unrealizedPL,
      unrealizedPLPercent,
      totalBudget,
      budgetSpent,
      budgetUsage,
      budgetPeriodLabel,
      budgetCategory: activeBudget?.category ?? '',
    }
  }, [monthlyExpenses, holdings, budgets, investmentAssets, selectedMonth, selectedMonthLabel])

  // Expense by category
  const expenseByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>()
    monthlyExpenses.forEach((e) => {
      if (e.transactionType !== 'income') {
        categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount)
      }
    })

    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }))
  }, [monthlyExpenses])

  // Weekly totals keep a full month readable without squeezing 28–31 bars.
  const expenseTrend = useMemo(() => {
    const weeks = Array.from({ length: 5 }, (_, index) => ({ date: `Minggu ${index + 1}`, amount: 0 }))
    monthlyExpenses.forEach((expense) => {
      if (expense.transactionType === 'income') return
      const day = Number(expense.date.slice(8, 10))
      const weekIndex = Math.min(4, Math.floor((day - 1) / 7))
      weeks[weekIndex].amount += expense.amount
    })
    return weeks
  }, [monthlyExpenses])

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  return (
    <div className="space-y-6">
      {!accountDataLoading && !userProfile.onboardingCompleted && (
        <section className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-semibold text-blue-900">Selamat datang di FinTrack</p><p className="mt-1 text-sm text-blue-700">Atur preferensi dan sumber dana agar FinTrack sesuai dengan kebutuhan Anda.</p></div>
          <Link to="/settings" className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700">Mulai pengaturan</Link>
        </section>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Lihat arus kas, budget, dan investasi Anda dalam satu ringkasan.</p>
        </div>
        <div className="dashboard-period-controls flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
          <label className="dashboard-month-field relative min-w-0">
            <span className="sr-only">Pilih bulan laporan</span>
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value || currentMonth)} className="dashboard-month-input w-full min-w-0 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" />
          </label>
          {selectedMonth !== currentMonth && <button type="button" onClick={() => setSelectedMonth(currentMonth)} className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">Bulan ini</button>}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-metrics-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dashboard-metric dashboard-expense-card bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Wallet className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Pengeluaran</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalExpenses)}</p>
          <div className="mt-2">
            <div className="flex items-center text-sm">
              <span className="text-gray-600">
                {metrics.totalBudget > 0
                  ? `Budget ${metrics.budgetCategory === 'Keseluruhan' ? '' : `${metrics.budgetCategory} `}${metrics.budgetPeriodLabel}: ${formatCurrency(metrics.totalBudget)}`
                  : `Belum ada budget bulanan untuk ${selectedMonthLabel}`}
              </span>
            </div>
            {metrics.totalBudget > 0 && <>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${metrics.budgetUsage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(metrics.budgetUsage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Terpakai {formatCurrency(metrics.budgetSpent)} ({metrics.budgetUsage.toFixed(1)}%)</p>
            </>}
          </div>
        </div>

        <div className="dashboard-metric dashboard-income-card bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="p-2 bg-green-100 rounded-lg w-fit mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Pemasukan</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalIncome)}</p>
        </div>

        <div className="dashboard-metric dashboard-balance-card bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className={`p-2 rounded-lg w-fit mb-4 ${metrics.cashFlowBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <Wallet className={`w-6 h-6 ${metrics.cashFlowBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <p className="text-sm text-gray-600 mb-1">Arus Kas Bersih</p>
          <p className={`text-3xl font-bold ${metrics.cashFlowBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(metrics.cashFlowBalance)}</p>
          <p className="text-xs text-gray-500 mt-2">Pemasukan dikurangi pengeluaran pada {selectedMonthLabel}</p>
        </div>

        <div className="dashboard-metric dashboard-portfolio-card bg-white rounded-xl shadow-sm p-5 border border-gray-200">
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

        <div className="dashboard-metric dashboard-profit-card bg-white rounded-xl shadow-sm p-5 border border-gray-200">
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

        <div className="dashboard-metric dashboard-assets-card bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Aset aktif</p>
          <p className="text-2xl font-bold text-gray-900">{(holdings ?? []).length + investmentAssets.filter((asset) => asset.market_value > 0).length}</p>
          <p className="text-sm text-gray-600 mt-1">Seluruh instrumen</p>
        </div>
      </div>

      {/* Budget Alert */}
      {metrics.totalBudget > 0 && metrics.budgetUsage > 80 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">Budget hampir terpakai</p>
            <p className="text-sm text-yellow-700 mt-1">
              Anda telah menggunakan {metrics.budgetUsage.toFixed(1)}% dari budget {metrics.budgetPeriodLabel}.
            </p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="mb-4"><h3 className="font-semibold text-gray-900">Tren pengeluaran</h3><p className="text-xs text-gray-500 mt-0.5">Per minggu · {selectedMonthLabel}</p></div>
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
          <div className="mb-4"><h3 className="font-semibold text-gray-900">Komposisi pengeluaran</h3><p className="text-xs text-gray-500 mt-0.5">Berdasarkan transaksi {selectedMonthLabel}</p></div>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPie>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </RechartsPie>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500">Belum ada data pengeluaran</div>
          )}
        </div>
      </div>

      {/* Holdings Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900">Kepemilikan saham</h3>
        <p className="text-xs text-gray-500 mt-0.5 mb-4">Maksimal lima posisi saham aktif</p>
        <div className="space-y-3">
          {(holdings ?? []).slice(0, 5).map((holding) => (
            <div key={holding.ticker} className="dashboard-holding-row flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{holding.ticker}</p>
                <p className="text-sm text-gray-600">
                  {holding.totalLots} lot ({holding.totalShares} lembar)
                </p>
              </div>
              <div className="dashboard-holding-value text-right shrink-0">
                <p className="font-medium text-gray-900">{formatCurrency(holding.marketValue)}</p>
                <p className={`text-sm ${holding.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {holding.unrealizedPL >= 0 ? '+' : ''}
                  {formatCurrency(holding.unrealizedPL)} ({holding.unrealizedPLPercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          ))}
          {(holdings ?? []).length === 0 && <p className="text-gray-500 text-center py-4">Belum ada saham aktif</p>}
        </div>
      </div>
    </div>
  )
}
