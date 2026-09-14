import { BarChart3, LockKeyhole, ReceiptText, ScanLine, WalletCards } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function About() {
  const { pick } = useLanguage();
  const capabilities = [
    { icon: ReceiptText, title: pick('Keuangan harian', 'Daily finances'), description: pick('Catat pemasukan dan pengeluaran, pisahkan sumber dana, atur budget, lalu temukan kembali transaksi berdasarkan tanggal.', 'Track income and expenses, separate fund sources, set budgets, and find transactions by date.') },
    { icon: BarChart3, title: pick('Investasi dalam satu tempat', 'Investments in one place'), description: pick('Pantau saham, reksa dana, ETF, obligasi, emas, kripto, dan aset lain dengan nilai yang dinormalisasi ke Rupiah.', 'Track stocks, mutual funds, ETFs, bonds, gold, crypto, and other assets with values normalized to Rupiah.') },
    { icon: LockKeyhole, title: pick('Data milik Anda', 'Your data'), description: pick('Halaman akun dilindungi login dan setiap transaksi ditautkan ke pemilik akun yang sedang aktif.', 'Account pages require login and every transaction belongs to the active account owner.') },
  ];
  return (
    <div className="about-page max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-medium text-blue-600 mb-1">{pick('Tentang FinTrack', 'About FinTrack')}</p>
        <h1 className="text-2xl font-bold text-gray-900">{pick('Satu tempat untuk memahami kondisi keuangan Anda', 'One place to understand your financial position')}</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">{pick('FinTrack Mentor membantu Anda mencatat arus kas, menjaga budget, dan memantau investasi tanpa memisahkan semuanya ke banyak aplikasi.', 'FinTrack Mentor helps you track cash flow, manage budgets, and monitor investments without splitting everything across multiple apps.')}</p>
      </header>

      <section className="about-hero">
        <div className="about-hero-mark"><img src="/fintrack-mark.svg" alt="" className="w-10 h-10 rounded-xl" /></div>
        <div>
          <p className="text-sm font-semibold text-blue-100">Personal wealth manager</p>
          <h2 className="text-2xl font-bold mt-1">{pick('Catat dengan sederhana. Pahami dengan jelas.', 'Track simply. Understand clearly.')}</h2>
          <p className="mt-2 text-blue-50">{pick('Angka yang ditampilkan berasal dari data akun Anda—bukan data contoh yang dibuat untuk memenuhi dashboard.', 'The figures shown come from your account data—not sample data created to fill a dashboard.')}</p>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{pick('Yang dapat Anda kelola', 'What you can manage')}</h2>
          <p className="text-sm text-gray-500 mt-1">{pick('Fitur inti FinTrack saat ini.', 'FinTrack’s current core features.')}</p>
        </div>
        <div className="divide-y divide-gray-100">
          {capabilities.map(({ icon: Icon, title, description }) => (
            <div key={title} className="about-capability flex items-start gap-4 p-5 sm:p-6">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
              <div><h3 className="font-semibold text-gray-900">{title}</h3><p className="text-sm text-gray-600 mt-1 leading-6">{description}</p></div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center gap-3"><WalletCards className="w-5 h-5 text-blue-600" /><h2 className="font-semibold text-gray-900">{pick('Cara nilai dihitung', 'How values are calculated')}</h2></div>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <p>{pick('Arus kas bersih adalah pemasukan dikurangi pengeluaran yang Anda catat.', 'Net cash flow is your recorded income minus expenses.')}</p>
            <p>{pick('Nilai portofolio memakai jumlah aset, harga terakhir, dan kurs manual untuk aset asing.', 'Portfolio value uses asset quantities, latest prices, and manual exchange rates for foreign assets.')}</p>
            <p>{pick('Health score adalah indikator edukatif berdasarkan komposisi aset, bukan rekomendasi investasi.', 'The health score is an educational indicator based on asset composition, not investment advice.')}</p>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center gap-3"><ScanLine className="w-5 h-5 text-blue-600" /><h2 className="font-semibold text-gray-900">{pick('Tentang scan struk', 'About receipt scanning')}</h2></div>
          <p className="text-sm text-gray-600 mt-4 leading-6">{pick('FinTrack dapat mencoba membaca merchant, tanggal, total, dan metode pembayaran dari foto struk. Hasil OCR tetap perlu diperiksa sebelum disimpan dan ketersediaannya bergantung pada konfigurasi server.', 'FinTrack can attempt to read the merchant, date, total, and payment method from a receipt photo. Review OCR results before saving; availability depends on server configuration.')}</p>
          <p className="text-xs text-gray-500 mt-3">{pick('Foto buram, terlipat, terpotong, atau minim cahaya dapat mengurangi akurasi.', 'Blurry, folded, cropped, or poorly lit photos may reduce accuracy.')}</p>
        </section>
      </div>

      <p className="text-xs text-gray-500 border-t border-gray-200 pt-4">FinTrack adalah alat pencatatan dan informasi. Analisis yang ditampilkan tidak menggantikan nasihat dari penasihat keuangan profesional.</p>
    </div>
  );
}
