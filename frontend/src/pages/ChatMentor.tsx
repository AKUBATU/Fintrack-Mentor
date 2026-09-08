import { useEffect, useRef, useState } from 'react';
import { Bot, CalendarClock, Loader, Send, ShieldCheck, Sparkles, User } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const welcomeMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Halo! Saya Mentor Keuangan FinTrack. Saya dapat merangkum pengeluaran, kategori terbesar, portofolio, dan dividen berdasarkan data akun Anda. Apa yang ingin Anda periksa hari ini?',
  timestamp: new Date(),
};

export default function ChatMentor() {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let active = true;
    api.chatHistory()
      .then((history) => {
        if (!active || history.length === 0) return;
        setMessages(history.map((message) => ({
          id: String(message.id), role: message.role, content: message.content,
          timestamp: new Date(message.created_at),
        })));
      })
      .catch((error) => {
        console.error('Failed to load daily chat history:', error);
        toast.error('Riwayat percakapan hari ini gagal dimuat');
      })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, []);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || loading || historyLoading) return;
    setMessages((current) => [...current, {
      id: `local-user-${Date.now()}`, role: 'user', content, timestamp: new Date(),
    }]);
    setInput('');
    setLoading(true);
    try {
      const result = await api.chat(content);
      setMessages((current) => [...current, {
        id: `local-assistant-${Date.now()}`, role: 'assistant',
        content: result.reply, timestamp: new Date(),
      }]);
    } catch (error) {
      setInput(content);
      toast.error(error instanceof Error ? error.message : 'Pesan gagal dikirim. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const formatTime = (date: Date) => new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit', minute: '2-digit',
  }).format(date);

  return (
    <div className="chat-page flex flex-col">
      <div className="mentor-header mb-4">
        <div className="mentor-header-main">
          <div className="mentor-header-icon"><Sparkles className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Chat Mentor</h1>
            <p className="text-sm text-gray-600">Ringkasan berbasis data akun, tanpa mengirim data ke layanan AI eksternal.</p>
          </div>
        </div>
        <div className="mentor-status-list">
          <span><ShieldCheck className="w-3.5 h-3.5" /> Data tetap di FinTrack</span>
          <span><CalendarClock className="w-3.5 h-3.5" /> Riwayat direset harian</span>
        </div>
      </div>

      <div className="mentor-conversation bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="mentor-conversation-bar">
          <div><p className="text-sm font-semibold text-gray-900">Percakapan hari ini</p><p className="text-xs text-gray-500">Konteks mengikuti data akun terbaru</p></div>
          <span className="mentor-online"><span /> Siap</span>
        </div>
        <div className="chat-messages overflow-y-auto p-6 space-y-4" aria-live="polite" aria-busy={loading || historyLoading}>
          {historyLoading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-gray-500"><Loader className="w-4 h-4 animate-spin" /> Memuat percakapan hari ini…</div>
          ) : messages.map((message) => (
            <div key={message.id} className={`mentor-message flex gap-3 ${message.role === 'user' ? 'mentor-message-user flex-row-reverse' : 'mentor-message-assistant'}`}>
              <div className={`mentor-avatar flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-blue-600' : 'bg-gray-900'}`}>
                {message.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`mentor-message-content flex-1 max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`mentor-bubble rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}><p className="text-sm whitespace-pre-wrap">{message.content}</p></div>
                <p className="text-xs text-gray-500 mt-1 px-2">{formatTime(message.timestamp)}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="mentor-message flex gap-3">
              <div className="mentor-avatar flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2"><Loader className="w-4 h-4 animate-spin text-gray-600" /><span className="text-sm text-gray-600">Mentor sedang merangkum data…</span></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-area border-t border-gray-200 p-4">
          <div className="mentor-composer flex gap-2">
            <textarea rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Contoh: rangkum pengeluaran bulan ini" className="flex-1 resize-none px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={loading || historyLoading} aria-label="Pesan untuk mentor" />
            <button type="button" onClick={() => void handleSend()} disabled={loading || historyLoading || !input.trim()} className="mentor-send-button px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Kirim pesan">{loading || historyLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
          </div>
          <p className="text-xs text-gray-500 mt-2 px-1">Enter untuk mengirim · Shift + Enter untuk baris baru</p>
        </div>
      </div>
    </div>
  );
}
