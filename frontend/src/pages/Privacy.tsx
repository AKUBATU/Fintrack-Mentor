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
          <section><h2 className="text-lg font-semibold text-gray-900">Kontrol Anda</h2><p>Anda dapat mengekspor data akun dan chat melalui halaman Profil. Foto struk dapat diunduh dari transaksi terkait. Anda juga dapat meminta penghapusan akun; penghapusan hanya diselesaikan setelah file struk dan data akun berhasil dihapus.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">Keamanan</h2><p>Kami menggunakan autentikasi dan pemisahan data per pengguna. Namun, tidak ada sistem internet yang dapat menjamin keamanan mutlak. Gunakan password yang kuat dan jangan membagikan akses akun.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">Pencegahan penyalahgunaan</h2><p>FinTrack menyimpan hash identitas jaringan dalam waktu terbatas untuk membatasi percobaan login, spam email, dan penggunaan fitur otomatis yang berlebihan. Catatan pembatasan ini dibersihkan secara berkala.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">Kontak</h2><p>Pertanyaan atau permintaan terkait privasi dapat disampaikan melalui halaman Issues pada repositori resmi FinTrack Mentor.</p><a href="https://github.com/AKUBATU/Fintrack-Mentor/issues" target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">Hubungi melalui GitHub Issues</a></section>
        </div>
      </article>
    </main>
  );
}
