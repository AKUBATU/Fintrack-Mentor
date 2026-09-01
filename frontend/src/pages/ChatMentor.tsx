import { useState, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Send, Bot, User, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ToolCall {
  name: string;
  result: any;
}

export default function ChatMentor() {
  const { 
    expenses, 
    holdings, 
    dailyReports, 
    userProfile, 
    addExpense,
    addStockTransaction,
    addDividend 
  } = useData();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Halo! Saya FinTrack Mentor AI, asisten keuangan Anda. 

Saya dapat membantu Anda dengan:
✅ Analisis portofolio & pengeluaran
✅ Rekomendasi strategi investasi
✅ Tracking DCA & dividen
✅ Menambahkan transaksi via chat

Saya akan menjawab dengan struktur:
1. **Analisis Masalah** - Memahami situasi Anda
2. **Asumsi Tersembunyi** - Faktor yang perlu dipertimbangkan
3. **Alternatif/Kontra-argumen** - Pilihan lain yang mungkin
4. **Kesimpulan** - Rekomendasi terbaik
5. **Next Step** - Langkah konkret yang bisa dilakukan

Tanyakan apa saja tentang keuangan Anda!`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let active = true;
    api.chatHistory()
      .then((history) => {
        if (!active || history.length === 0) return;
        setMessages(history.map((message) => ({
          id: String(message.id),
          role: message.role,
          content: message.content,
          timestamp: new Date(message.created_at),
        })));
      })
      .catch((error) => console.error('Failed to load daily chat history:', error))
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, []);

  // Tool functions that chatbot can call
  const tools = {
    get_portfolio_summary: (dateRange?: string) => {
      const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
      const totalCost = holdings.reduce((sum, h) => sum + h.costBasis, 0);
      const unrealizedPL = totalValue - totalCost;
      const unrealizedPLPercent = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;

      return {
        totalValue,
        totalCost,
        unrealizedPL,
        unrealizedPLPercent,
        holdings: holdings.map(h => ({
          ticker: h.ticker,
          lots: h.totalLots,
          avgPrice: h.avgPrice,
          currentPrice: h.currentPrice,
          unrealizedPL: h.unrealizedPL,
          unrealizedPLPercent: h.unrealizedPLPercent
        }))
      };
    },

    get_expense_summary: (dateRange?: string) => {
      const currentMonth = new Date().getMonth();
      const monthlyExpenses = expenses.filter(e => {
        const date = new Date(e.date);
        return date.getMonth() === currentMonth;
      });

      const total = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
      const byCategory = new Map<string, number>();
      monthlyExpenses.forEach(e => {
        byCategory.set(e.category, (byCategory.get(e.category) || 0) + e.amount);
      });

      return {
        total,
        count: monthlyExpenses.length,
        byCategory: Object.fromEntries(byCategory),
        transactions: monthlyExpenses.slice(0, 5)
      };
    },

    get_daily_reports: (dateRange?: string) => {
      return {
        reports: dailyReports.slice(0, 7),
        latest: dailyReports[0]
      };
    },

    get_user_profile: () => {
      return userProfile;
    }
  };

  // Mock AI response generator
  const generateAIResponse = async (userMessage: string): Promise<{ content: string; toolCalls?: ToolCall[] }> => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    const lowerMessage = userMessage.toLowerCase();
    let toolCalls: ToolCall[] = [];

    // Check if user is asking about portfolio
    if (lowerMessage.includes('portofolio') || lowerMessage.includes('saham') || lowerMessage.includes('investasi')) {
      const portfolioData = tools.get_portfolio_summary();
      toolCalls.push({ name: 'get_portfolio_summary', result: portfolioData });

      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0
        }).format(value);
      };

      return {
        content: `**1. Analisis Masalah**
Anda ingin mengetahui kondisi portofolio investasi Anda saat ini.

**2. Asumsi Tersembunyi**
- Harga saham yang tercatat adalah harga terakhir yang diinput manual
- Belum memperhitungkan biaya pajak dan dividend yang akan dibayarkan
- Market condition bisa berubah sewaktu-waktu

**3. Data Portofolio Anda:**
📊 **Nilai Total:** ${formatCurrency(portfolioData.totalValue)}
💰 **Modal:** ${formatCurrency(portfolioData.totalCost)}
📈 **Unrealized P/L:** ${portfolioData.unrealizedPL >= 0 ? '+' : ''}${formatCurrency(portfolioData.unrealizedPL)} (${portfolioData.unrealizedPLPercent.toFixed(2)}%)

**Holdings:**
${portfolioData.holdings.map(h => 
  `• ${h.ticker}: ${h.lots} lot @ avg ${formatCurrency(h.avgPrice)} | P/L: ${h.unrealizedPL >= 0 ? '+' : ''}${formatCurrency(h.unrealizedPL)} (${h.unrealizedPLPercent.toFixed(2)}%)`
).join('\n')}

**4. Alternatif & Rekomendasi**
Berdasarkan profil DCA Anda (${formatCurrency(userProfile.dcaAmount)}/minggu ke bluechip):
- **Jika untung >20%:** Pertimbangkan take profit sebagian untuk rebalancing
- **Jika rugi <-10%:** Hold atau averaging down jika fundamental masih kuat
- **Dividen:** Reinvest untuk compound growth

**5. Kesimpulan**
${portfolioData.unrealizedPLPercent > 0 
  ? 'Portofolio Anda sedang dalam kondisi profit. Good job! 🎉' 
  : 'Portofolio sedang merah, tapi ini normal dalam investasi jangka panjang. Stay calm! 💪'
}

**6. Next Step**
✅ Update harga saham secara berkala
✅ Lanjutkan DCA rutin sesuai strategi
✅ Catat daily report untuk tracking equity curve
✅ Review dan rebalance setiap 3 bulan`,
        toolCalls
      };
    }

    // Check if user is asking about expenses
    if (lowerMessage.includes('pengeluaran') || lowerMessage.includes('expense') || lowerMessage.includes('budget')) {
      const expenseData = tools.get_expense_summary();
      toolCalls.push({ name: 'get_expense_summary', result: expenseData });

      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0
        }).format(value);
      };

      return {
        content: `**1. Analisis Masalah**
Anda ingin menganalisis pengeluaran bulanan Anda.

**2. Data Pengeluaran Bulan Ini:**
💸 **Total:** ${formatCurrency(expenseData.total)}
📝 **Jumlah Transaksi:** ${expenseData.count}

**Per Kategori:**
${Object.entries(expenseData.byCategory).map(([cat, amount]) => 
  `• ${cat}: ${formatCurrency(amount as number)}`
).join('\n')}

**3. Asumsi & Faktor Tersembunyi**
- Pengeluaran besar di kategori tertentu mungkin ada pengeluaran tidak terduga
- Budget ideal: 50% kebutuhan, 30% keinginan, 20% investasi/saving
- AI sudah memprediksi kategori dengan akurasi tinggi

**4. Alternatif Optimasi**
- Kurangi pengeluaran di kategori tertinggi 10-20%
- Set budget alert untuk mencegah overspending
- Review merchant yang sering muncul

**5. Kesimpulan**
${expenseData.total > 3000000 
  ? 'Pengeluaran cukup tinggi. Pertimbangkan untuk lebih disiplin di bulan depan.' 
  : 'Pengeluaran terkendali dengan baik! 👍'
}

**6. Next Step**
✅ Set budget per kategori di halaman Expenses
✅ Track pengeluaran harian agar tidak lupa
✅ Sisihkan sisa uang untuk DCA investasi
✅ Review anomaly detection untuk spot pengeluaran tidak wajar`,
        toolCalls
      };
    }

    // Check if asking about DCA strategy
    if (lowerMessage.includes('dca') || lowerMessage.includes('strategi') || lowerMessage.includes('strategy')) {
      const profile = tools.get_user_profile();
      
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0
        }).format(value);
      };

      return {
        content: `**1. Analisis Strategi DCA Anda**
Anda sedang menjalankan strategi: "${profile.dcaStrategy}"

**2. Profil DCA:**
💰 **Alokasi:** ${formatCurrency(profile.dcaAmount)}/${profile.dcaFrequency === 'weekly' ? 'minggu' : 'bulan'}
🎯 **Saham Fokus:** ${profile.focusStocks.join(', ')}
♻️ **Compounding Dividen:** ${profile.compoundingDividends ? 'Ya (Reinvest)' : 'Tidak'}
⚠️ **Catatan:** ${profile.bonusWeekRule}

**3. Asumsi Tersembunyi**
- Market akan fluktuatif, DCA membantu averaging
- Bluechip seperti BBCA, BBRI memiliki fundamental kuat
- Compound effect butuh waktu minimal 3-5 tahun

**4. Alternatif Strategi**
**Konservatif (Risk-averse):**
- 70% bluechip, 30% dividen yield tinggi
- Hold jangka panjang 5-10 tahun

**Agresif (Higher risk):**
- 50% growth stocks, 50% bluechip
- Active trading dengan technical analysis

**Balanced (Recommended untuk investor pemula):**
- 60% bluechip dividen, 40% growth potential
- DCA konsisten + reinvest dividen

**5. Kesimpulan**
Strategi DCA Anda sudah solid untuk investor pemula! Focus on consistency adalah kunci.

**6. Next Step**
✅ Patuhi jadwal DCA (jangan skip karena emosi market)
✅ Set reminder mingguan untuk transaksi
✅ Monitor P/L tapi jangan panik saat merah
✅ Tingkatkan alokasi DCA seiring kenaikan income
✅ Diversifikasi ke 5-7 saham untuk risk management`,
        toolCalls
      };
    }

    // Default response
    return {
      content: `**1. Analisis**
Saya mengerti pertanyaan Anda tentang "${userMessage}".

**2. Asumsi**
Setiap keputusan finansial memiliki trade-off antara risk dan return.

**3. Alternatif**
Saya bisa membantu Anda dengan:
- Analisis portofolio (tanya "bagaimana portofolio saya?")
- Review pengeluaran (tanya "analisis pengeluaran saya")
- Strategi investasi (tanya "review strategi DCA saya")
- Tips saving & budgeting

**4. Kesimpulan**
Keuangan yang sehat = income tracking + expense control + consistent investing

**5. Next Step**
Coba tanyakan hal spesifik tentang portofolio, pengeluaran, atau strategi investasi Anda! 

Contoh pertanyaan:
- "Bagaimana performa portofolio saya?"
- "Apakah pengeluaran saya bulan ini wajar?"
- "Berapa target DCA saya untuk tahun ini?"`,
      toolCalls
    };
  };

  const handleSend = async () => {
    if (!input.trim() || loading || historyLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let response: { content: string; toolCalls?: ToolCall[] };
      try {
        const result = await api.chat(input);
        response = { content: result.reply };
      } catch {
        response = await generateAIResponse(input);
        toast.warning('Backend AI tidak tersedia, menggunakan respons lokal.');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show tool calls if any
      if (response.toolCalls && response.toolCalls.length > 0) {
        toast.success(`AI menggunakan ${response.toolCalls.length} tool untuk menganalisis data Anda`);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="chat-page flex flex-col h-[calc(100vh-12rem)]">
      {/* Header Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <Bot className="w-6 h-6 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Mentor Keuangan FinTrack</h3>
            <p className="text-sm text-blue-700 mt-1">
              Mentor lokal ini merangkum portofolio dan pengeluaran berdasarkan data akun Anda.
              <br />
              <span className="text-xs">
                🔒 Analisis berjalan di server FinTrack tanpa mengirim data ke layanan kecerdasan buatan eksternal.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="chat-messages flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-blue-600' : 'bg-green-600'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 px-2">
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin text-gray-600" />
                  <span className="text-sm text-gray-600">AI sedang menganalisis...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chat-input-area border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tanyakan tentang portofolio, pengeluaran, atau strategi investasi..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || historyLoading}
            />
            <button
              onClick={handleSend}
              disabled={loading || historyLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {historyLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Tips: Tanya "analisis portofolio saya" atau "review pengeluaran bulan ini"
          </p>
        </div>
      </div>
    </div>
  );
}
