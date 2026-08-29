import { Calculator, Database, HeartPulse, ScanLine, ShieldCheck, WalletCards, Landmark, Coins, History, KeyRound } from 'lucide-react';

const features = [
  { icon: WalletCards, title: 'Pencatatan keuangan', description: 'Kelola pemasukan, pengeluaran, budget, history transaksi, dan foto struk dalam satu akun.' },
  { icon: ScanLine, title: 'Scan struk lokal', description: 'Tesseract OCR membaca teks struk tanpa mengirim foto ke layanan AI eksternal.' },
  { icon: HeartPulse, title: 'Portofolio lintas instrumen', description: 'Catat saham, reksa dana, ETF, obligasi, kripto, emas, properti, dan instrumen lainnya.' },
  { icon: ShieldCheck, title: 'Data terpisah per user', description: 'Setiap request data dilindungi autentikasi dan diperiksa berdasarkan pemilik akun.' },
  { icon: History, title: 'History yang dapat dikelola', description: 'Transaksi keuangan dan saham dapat dilihat kembali, diedit jika salah, atau dihapus dengan konfirmasi.' },
  { icon: KeyRound, title: 'Keamanan akun', description: 'Autentikasi JWT, password terenkripsi, serta alur lupa dan reset password dengan token sekali pakai.' },
];

const instrumentGroups = [
  ['Pasar modal', 'Saham, ETF, reksa dana, obligasi, dan derivatif'],
  ['Aset likuid', 'Kas, deposito, forex, dan dana pensiun'],
  ['Aset alternatif', 'Kripto, emas, komoditas, properti, dan koleksi'],
  ['Investasi privat', 'Bisnis, private equity, P2P lending, dan asuransi investasi'],
  ['Instrumen lain', 'Kategori fleksibel untuk aset yang belum tersedia dalam daftar'],
];

export default function About() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600 mb-1">Tentang aplikasi</p>
        <h1 className="text-2xl font-bold text-gray-900">FinTrack Mentor</h1>
        <p className="text-gray-600 mt-1">Personal wealth manager untuk membantu pencatatan keuangan dan pemantauan investasi secara terstruktur.</p>
      </div>

      <div className="about-hero">
        <div className="about-hero-mark"><WalletCards className="w-8 h-8" /></div>
        <div>
          <h2 className="text-2xl font-bold">Keuangan yang lebih mudah dipahami</h2>
          <p className="mt-2">FinTrack menyatukan arus kas, budget, aset investasi, dividen, dan analisis kesehatan portofolio dalam satu dashboard.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map(({ icon: Icon, title, description }) => (
          <div key={title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4"><Icon className="w-5 h-5" /></div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-2">{description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-2"><Landmark className="w-5 h-5 text-blue-600" /><h3 className="font-semibold text-gray-900">Instrumen yang Didukung</h3></div>
        <p className="text-sm text-gray-600 mb-5">FinTrack menggunakan pencatatan aset generik sehingga berbagai kelas investasi dapat disimpan dalam satu portofolio.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {instrumentGroups.map(([title, detail]) => (
            <div key={title} className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="text-sm text-gray-600 mt-1">{detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
          Aset mata uang asing dikonversi ke Rupiah menggunakan kurs ke IDR yang dimasukkan user. Harga pasar dan kurs belum diperbarui otomatis.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4"><Coins className="w-5 h-5 text-blue-600" /><h3 className="font-semibold text-gray-900">Pengelolaan Portofolio</h3></div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Transaksi saham beli dan jual berbasis lot atau lembar.</li>
            <li>• Edit dan hapus transaksi jika terjadi kesalahan input.</li>
            <li>• Perhitungan holdings, modal, harga rata-rata, serta realized dan unrealized P/L.</li>
            <li>• Pencatatan dividen berdasarkan jumlah lembar dan tanggal pembayaran.</li>
            <li>• Aset non-saham dapat ditambah, diperbarui, dan dihapus secara terpisah.</li>
          </ul>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4"><ScanLine className="w-5 h-5 text-blue-600" /><h3 className="font-semibold text-gray-900">Keuangan & Scan Struk</h3></div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Pencatatan pemasukan dan pengeluaran beserta budget kategori.</li>
            <li>• Pencarian, filter, import, dan export history transaksi.</li>
            <li>• Lampiran foto struk yang hanya dapat diakses pemilik transaksi.</li>
            <li>• OCR lokal membaca merchant, tanggal, total, pembayaran, kategori, pajak, diskon, item, dan teks struk.</li>
            <li>• Hingga empat foto dapat digabungkan untuk membantu membaca struk terlipat.</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4"><Calculator className="w-5 h-5 text-blue-600" /><h3 className="font-semibold text-gray-900">Metode Perhitungan</h3></div>
          <div className="space-y-3 text-sm text-gray-600">
            <p><strong className="text-gray-900">Saham:</strong> 1 lot sama dengan 100 lembar.</p>
            <p><strong className="text-gray-900">Harga rata-rata:</strong> total biaya beli dibagi jumlah lembar.</p>
            <p><strong className="text-gray-900">Unrealized P/L:</strong> nilai terkini dikurangi modal kepemilikan.</p>
            <p><strong className="text-gray-900">Realized P/L:</strong> dihitung saat transaksi jual berdasarkan harga rata-rata.</p>
            <p><strong className="text-gray-900">Health score:</strong> kombinasi diversifikasi, konsentrasi, likuiditas, dan keseimbangan risiko.</p>
            <p><strong className="text-gray-900">Normalisasi nilai:</strong> jumlah unit × harga per unit × kurs ke IDR.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4"><Database className="w-5 h-5 text-blue-600" /><h3 className="font-semibold text-gray-900">Teknologi & Penyimpanan</h3></div>
          <div className="space-y-3 text-sm text-gray-600">
            <p><strong className="text-gray-900">Frontend:</strong> React, TypeScript, dan Tailwind CSS.</p>
            <p><strong className="text-gray-900">Backend:</strong> FastAPI dan SQLAlchemy.</p>
            <p><strong className="text-gray-900">Database:</strong> SQLite untuk lokal atau PostgreSQL melalui konfigurasi.</p>
            <p><strong className="text-gray-900">Migrasi:</strong> Alembic menjaga perubahan schema tetap terkontrol.</p>
            <p><strong className="text-gray-900">OCR:</strong> Tesseract berjalan lokal untuk membaca foto struk.</p>
            <p><strong className="text-gray-900">Isolasi:</strong> transaksi, budget, aset, saham, dan dividen ditautkan ke ID pemilik akun.</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        Analisis kesehatan portofolio bersifat edukatif dan tidak menggantikan saran dari penasihat keuangan profesional.
      </div>
    </div>
  );
}
