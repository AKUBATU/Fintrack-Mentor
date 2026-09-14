import { Link } from 'react-router-dom';
import LanguageSelect from '../components/LanguageSelect';
import { useLanguage } from '../contexts/LanguageContext';

export default function Privacy() {
  const { pick } = useLanguage();
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <article className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex items-center justify-between gap-3"><Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">← {pick('Kembali ke FinTrack', 'Back to FinTrack')}</Link><LanguageSelect compact /></div>
        <h1 className="mt-6 text-3xl font-bold">{pick('Kebijakan Privasi', 'Privacy Policy')}</h1>
        <p className="mt-2 text-sm text-gray-500">{pick('Terakhir diperbarui: 14 September 2026', 'Last updated: September 14, 2026')}</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-gray-700">
          <section><h2 className="text-lg font-semibold text-gray-900">{pick('Data yang disimpan', 'Data we store')}</h2><p>{pick('FinTrack menyimpan identitas akun, transaksi, budget, sumber dana, data portofolio, preferensi, percakapan mentor, serta foto struk yang Anda unggah. Data setiap akun dipisahkan berdasarkan pengguna.', 'FinTrack stores account identity, transactions, budgets, fund sources, portfolio data, preferences, mentor conversations, and uploaded receipt photos. Each account’s data is separated by user.')}</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">{pick('Cara data digunakan', 'How data is used')}</h2><p>{pick('Data digunakan untuk menjalankan pencatatan keuangan, perhitungan portofolio, analisis mentor, pemindaian struk, ekspor data, dan fungsi akun. FinTrack tidak menjual data pribadi Anda.', 'Data is used to provide financial tracking, portfolio calculations, mentor analysis, receipt scanning, data exports, and account functions. FinTrack does not sell your personal data.')}</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">{pick('Penyedia layanan', 'Service providers')}</h2><p>{pick('Aplikasi dapat menggunakan layanan hosting, basis data, penyimpanan berkas, dan OCR pihak ketiga. Data yang diperlukan dapat diproses oleh penyedia tersebut untuk menjalankan fitur terkait.', 'The app may use third-party hosting, database, file storage, and OCR services. Required data may be processed by those providers to operate related features.')}</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">{pick('Kontrol Anda', 'Your controls')}</h2><p>{pick('Anda dapat mengekspor data akun dan chat melalui halaman Profil. Foto struk dapat diunduh dari transaksi terkait. Anda juga dapat meminta penghapusan akun.', 'You can export account and chat data from the Profile page, download receipt photos from related transactions, and request account deletion.')}</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">{pick('Keamanan', 'Security')}</h2><p>{pick('Kami menggunakan autentikasi dan pemisahan data per pengguna. Namun, tidak ada sistem internet yang dapat menjamin keamanan mutlak. Gunakan password yang kuat dan jangan membagikan akses akun.', 'We use authentication and per-user data separation. No internet system can guarantee absolute security, so use a strong password and do not share account access.')}</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">{pick('Kontak', 'Contact')}</h2><p>{pick('Pertanyaan atau permintaan terkait privasi dapat disampaikan melalui halaman Issues pada repositori resmi FinTrack Mentor.', 'Privacy questions or requests can be submitted through the official FinTrack Mentor repository’s Issues page.')}</p><a href="https://github.com/AKUBATU/Fintrack-Mentor/issues" target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">{pick('Hubungi melalui GitHub Issues', 'Contact us through GitHub Issues')}</a></section>
        </div>
      </article>
    </main>
  );
}
