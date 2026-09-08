import { BarChart3, LockKeyhole, ReceiptText, ScanLine, WalletCards } from 'lucide-react';

const capabilities = [
  {
    icon: ReceiptText,
    title: 'Keuangan harian',
    description: 'Catat pemasukan dan pengeluaran, pisahkan sumber dana, atur budget, lalu temukan kembali transaksi berdasarkan tanggal.',
  },
  {
    icon: BarChart3,
    title: 'Investasi dalam satu tempat',
    description: 'Pantau saham, reksa dana, ETF, obligasi, emas, kripto, dan aset lain dengan nilai yang dinormalisasi ke Rupiah.',
  },
  {
    icon: LockKeyhole,
    title: 'Data milik Anda',
    description: 'Halaman akun dilindungi login dan setiap transaksi ditautkan ke pemilik akun yang sedang aktif.',
  },
];

export default function About() {
  return (
    <div className="about-page max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-medium text-blue-600 mb-1">Tentang FinTrack</p>
        <h1 className="text-2xl font-bold text-gray-900">Satu tempat untuk memahami kondisi keuangan Anda</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">FinTrack Mentor membantu Anda mencatat arus kas, menjaga budget, dan memantau investasi tanpa memisahkan semuanya ke banyak aplikasi.</p>
      </header>

      <section className="about-hero">
        <div className="about-hero-mark"><img src="/fintrack-mark.svg" alt="" className="w-10 h-10 rounded-xl" /></div>
        <div>
          <p className="text-sm font-semibold text-blue-100">Personal wealth manager</p>
          <h2 className="text-2xl font-bold mt-1">Catat dengan sederhana. Pahami dengan jelas.</h2>
          <p className="mt-2 text-blue-50">Angka yang ditampilkan berasal dari data akun Anda—bukan data contoh yang dibuat untuk memenuhi dashboard.</p>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Yang dapat Anda kelola</h2>
          <p className="text-sm text-gray-500 mt-1">Fitur inti FinTrack saat ini.</p>
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
          <div className="flex items-center gap-3"><WalletCards className="w-5 h-5 text-blue-600" /><h2 className="font-semibold text-gray-900">Cara nilai dihitung</h2></div>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <p><strong className="text-gray-900">Arus kas bersih</strong> adalah pemasukan dikurangi pengeluaran yang Anda catat.</p>
            <p><strong className="text-gray-900">Nilai portofolio</strong> memakai jumlah aset, harga terakhir, dan kurs manual untuk aset asing.</p>
            <p><strong className="text-gray-900">Health score</strong> adalah indikator edukatif berdasarkan komposisi aset, bukan rekomendasi investasi.</p>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center gap-3"><ScanLine className="w-5 h-5 text-blue-600" /><h2 className="font-semibold text-gray-900">Tentang scan struk</h2></div>
          <p className="text-sm text-gray-600 mt-4 leading-6">FinTrack dapat mencoba membaca merchant, tanggal, total, dan metode pembayaran dari foto struk. Hasil OCR tetap perlu diperiksa sebelum disimpan dan ketersediaannya bergantung pada konfigurasi server.</p>
          <p className="text-xs text-gray-500 mt-3">Foto buram, terlipat, terpotong, atau minim cahaya dapat mengurangi akurasi.</p>
        </section>
      </div>

      <p className="text-xs text-gray-500 border-t border-gray-200 pt-4">FinTrack adalah alat pencatatan dan informasi. Analisis yang ditampilkan tidak menggantikan nasihat dari penasihat keuangan profesional.</p>
    </div>
  );
}
