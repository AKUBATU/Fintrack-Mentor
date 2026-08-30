export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function getToken() {
  return localStorage.getItem('access_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // default json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(`Backend tidak dapat dihubungi di ${API_BASE_URL}. Pastikan server FastAPI sudah berjalan.`);
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let data: any = null;
  try {
    data = isJson ? await res.json() : await res.text();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const detail = data?.detail ?? data ?? 'Request failed';
    if (res.status === 401 && getToken()) {
      localStorage.removeItem('access_token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    if (Array.isArray(detail)) {
      const message = detail.map((item) => {
        const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : null;
        return `${field ? `${field}: ` : ''}${item?.msg || 'Data tidak valid'}`;
      }).join(', ');
      throw new Error(message || 'Data tidak valid');
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  return data as T;
}

/* =====================================================
   Normalizers (Frontend payload -> Backend schema)
   FastAPI/Pydantic sering pakai snake_case & required fields
===================================================== */

function normalizeExpensePayload(payload: any) {
  // BE biasanya butuh: date, amount, category, payment_method, merchant, notes, description
  const merchant = payload?.merchant ?? '';
  const notes = payload?.notes ?? '';

  return {
    date: payload.date,
    amount: payload.amount,
    transaction_type: payload.transactionType ?? payload.transaction_type ?? 'expense',
    category: payload.category,
    payment_method: payload.paymentMethod ?? payload.payment_method ?? '',
    merchant,
    notes,
    predicted_category: payload.predictedCategory ?? payload.predicted_category,
    confidence: payload.confidence,
    model_used: payload.modelUsed ?? payload.model_used,
  };
}

function normalizeBudgetPayload(payload: any) {
  // BE biasanya: category, amount, period
  return {
    category: payload.category,
    amount: payload.amount,
    period: payload.period ?? 'monthly',
  };
}

function normalizeDividendPayload(payload: any) {
  // BE sering require: ticker, amount, record_date, payment_date
  // FE kamu: recordDate/paymentDate (camelCase)
  const recordDate = payload.recordDate ?? payload.record_date;
  const paymentDate = payload.paymentDate ?? payload.payment_date;

  return {
    ticker: payload.ticker,
    amount: payload.amount,
    record_date: recordDate,
    payment_date: paymentDate,
  };
}

function normalizeReportPayload(payload: any) {
  // BE sering require: date, portfolio_value, notes, screenshot_url (optional)
  return {
    date: payload.date,
    portfolio_value: payload.portfolioValue ?? payload.portfolio_value,
    notes: payload.notes ?? '',
    screenshot_url: payload.screenshotUrl ?? payload.screenshot_url,
  };
}

export const api = {
  async register(name: string, email: string, password: string) {
    return request<{ id: number; email: string; name: string }>(`/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async login(email: string, password: string) {
    const form = new URLSearchParams();
    form.set('username', email);
    form.set('password', password);

    return request<{ user: { id: number; email: string; name: string }; access_token: string; token_type: string }>(
      `/api/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      }
    );
  },

  async forgotPassword(email: string) {
    return request<{ message: string; reset_url?: string | null }>(`/api/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, password: string) {
    return request<{ message: string }>(`/api/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  async me() {
    return request<{ id: number; email: string; name: string }>(`/api/auth/me`);
  },

  // Expenses
  async listExpenses() {
    return request<any[]>(`/api/expenses`);
  },
  async createExpense(payload: any) {
    const body = normalizeExpensePayload(payload);
    return request<any>(`/api/expenses`, { method: 'POST', body: JSON.stringify(body) });
  },
  async updateExpense(id: number, payload: any) {
    const body = normalizeExpensePayload(payload);
    return request<any>(`/api/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  },
  async deleteExpense(id: number) {
    return request<{ ok: boolean }>(`/api/expenses/${id}`, { method: 'DELETE' });
  },
  async uploadReceipt(id: number, receipt: File) {
    const body = new FormData();
    body.append('receipt', receipt);
    return request<{ has_receipt: boolean }>(`/api/expenses/${id}/receipt`, {
      method: 'POST',
      body,
    });
  },
  async scanReceipt(receipts: File[]) {
    const body = new FormData();
    receipts.forEach((receipt) => body.append('receipts', receipt));
    return request<{
      merchant: string;
      date: string | null;
      amount: number | null;
      payment_method: string;
      category: string;
      notes: string;
      receipt_number: string;
      tax: number | null;
      discount: number | null;
      line_items: Array<{ name?: string; quantity?: number; unit_price?: number; total?: number }>;
      raw_text: string;
    }>(`/api/expenses/scan-receipt`, { method: 'POST', body });
  },
  async getReceiptBlob(id: number) {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/api/expenses/${id}/receipt`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Foto struk tidak dapat dimuat');
    return res.blob();
  },

  // Budgets
  async listBudgets() {
    return request<any[]>(`/api/budgets`);
  },
  async createBudget(payload: any) {
    const body = normalizeBudgetPayload(payload);
    return request<any>(`/api/budgets`, { method: 'POST', body: JSON.stringify(body) });
  },
  async updateBudget(id: number, payload: any) {
    const body = normalizeBudgetPayload(payload);
    return request<any>(`/api/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  },
  async deleteBudget(id: number) {
    return request<{ ok: boolean }>(`/api/budgets/${id}`, { method: 'DELETE' });
  },

  // Portfolio
  async listTransactions() {
    return request<any[]>(`/api/portfolio/transactions`);
  },
  async addTransaction(payload: any) {
    // transaksi kamu sudah cocok (ticker/type/shares/price/date)
    return request<any>(`/api/portfolio/transactions`, { method: 'POST', body: JSON.stringify(payload) });
  },
  async updateTransaction(id: number, payload: any) {
    return request<any>(`/api/portfolio/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  async deleteTransaction(id: number) {
    return request<{ ok: boolean }>(`/api/portfolio/transactions/${id}`, { method: 'DELETE' });
  },
  async listDividends() {
    return request<any[]>(`/api/portfolio/dividends`);
  },
  async addDividend(payload: any) {
    const body = normalizeDividendPayload(payload);
    return request<any>(`/api/portfolio/dividends`, { method: 'POST', body: JSON.stringify(body) });
  },
  async portfolioSummary() {
    return request<any>(`/api/portfolio/summary`);
  },

  // Generic investment assets
  async listInvestmentAssets() {
    return request<any[]>(`/api/investment-assets`);
  },
  async createInvestmentAsset(payload: any) {
    return request<any>(`/api/investment-assets`, { method: 'POST', body: JSON.stringify(payload) });
  },
  async investmentExchangeRate(currency: string) {
    return request<{ currency: string; rate: number; date: string | null }>(`/api/investment-assets/exchange-rate?currency=${encodeURIComponent(currency)}`);
  },
  async updateInvestmentAsset(id: number, payload: any) {
    return request<any>(`/api/investment-assets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  async deleteInvestmentAsset(id: number) {
    return request<{ ok: boolean }>(`/api/investment-assets/${id}`, { method: 'DELETE' });
  },
  async portfolioHealth() {
    return request<any>(`/api/investment-assets/health/summary`);
  },

  // Reports
  async listReports() {
    return request<any[]>(`/api/reports`);
  },
  async addReport(payload: any) {
    const body = normalizeReportPayload(payload);
    return request<any>(`/api/reports`, { method: 'POST', body: JSON.stringify(body) });
  },

  // ML
  async predictCategory(text: string, amount?: number) {
    return request<any>(`/api/ml/predict-category`, {
      method: 'POST',
      body: JSON.stringify({ text, amount }),
    });
  },
  async feedbackCategory(text: string, amount: number, category: string) {
    return request<any>(`/api/ml/feedback`, {
      method: 'POST',
      body: JSON.stringify({ text, amount, correct_category: category }),
    });
  },
  async anomalies() {
    return request<any[]>(`/api/ml/anomalies`);
  },

  // Chat
  async chat(message: string) {
    return request<{ reply: string }>(`/api/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
};
