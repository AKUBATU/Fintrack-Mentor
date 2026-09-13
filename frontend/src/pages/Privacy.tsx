import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <article className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">← Kembali ke FinTrack</Link>
        <h1 className="mt-6 text-3xl font-bold">Kebijakan Privasi</h1>
        <p className="mt-2 text-sm text-gray-500">Terakhir diperbarui: 14 September 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-gray-700">
          <section><h2 className="text-lg font-semibold text-gray-900">Data yang disimpan</h2><p>FinTrack menyimpan identitas akun, transaksi, budget, sumber dana, data portofolio, preferensi, percakapan mentor, serta foto struk yang Anda unggah. Data setiap akun dipisahkan berdasarkan pengguna.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">Cara data digunakan</h2><p>Data digunakan untuk menjalankan pencatatan keuangan, perhitungan portofolio, analisis mentor, pemindaian struk, ekspor data, dan fungsi akun. FinTrack tidak menjual data pribadi Anda.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">Penyedia layanan</h2><p>Aplikasi dapat menggunakan layanan hosting, basis data, penyimpanan berkas, dan OCR pihak ketiga. Data yang diperlukan dapat diproses oleh penyedia tersebut untuk menjalankan fitur terkait.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">Kontrol Anda</h2><p>Anda dapat mengekspor data melalui halaman Profil atau menghapus akun beserta seluruh datanya. Penghapusan bersifat permanen dan tidak dapat dibatalkan.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">Keamanan</h2><p>Kami menggunakan autentikasi dan pemisahan data per pengguna. Namun, tidak ada sistem internet yang dapat menjamin keamanan mutlak. Gunakan password yang kuat dan jangan membagikan akses akun.</p></section>
        </div>
      </article>
    </main>
  );
}
