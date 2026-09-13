import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <article className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">← Kembali ke FinTrack</Link>
        <h1 className="mt-6 text-3xl font-bold">Ketentuan Penggunaan</h1>
        <p className="mt-2 text-sm text-gray-500">Terakhir diperbarui: 14 September 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-gray-700">
          <section><h2 className="text-lg font-semibold text-gray-900">Tujuan layanan</h2><p>FinTrack adalah alat pencatatan dan edukasi keuangan pribadi. Informasi, analisis, dan respons Chat Mentor bukan nasihat keuangan, pajak, atau investasi profesional.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">Tanggung jawab pengguna</h2><p>Anda bertanggung jawab atas keakuratan data yang dimasukkan, keamanan password, dan keputusan yang dibuat berdasarkan informasi aplikasi. Periksa kembali hasil pemindaian struk dan perhitungan sebelum menggunakannya.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">Penggunaan yang wajar</h2><p>Jangan menggunakan layanan untuk aktivitas melanggar hukum, mencoba mengakses akun orang lain, mengganggu layanan, atau mengunggah konten berbahaya.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">Ketersediaan</h2><p>Layanan dapat berubah, mengalami pemeliharaan, atau dibatasi oleh kuota penyedia hosting gratis. Kami berupaya menjaga data dan fungsi tetap tersedia, tetapi tidak menjamin layanan tanpa gangguan.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">Penghapusan akun</h2><p>Anda dapat menghapus akun dari halaman Profil. Tindakan tersebut menghapus data akun secara permanen dan tidak dapat dibatalkan.</p></section>
        </div>
      </article>
    </main>
  );
}
