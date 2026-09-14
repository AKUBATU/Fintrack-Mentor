import { Link } from 'react-router-dom';
import LanguageSelect from '../components/LanguageSelect';
import { useLanguage } from '../contexts/LanguageContext';

export default function Terms() {
  const { pick } = useLanguage();
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <article className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex items-center justify-between gap-3"><Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">← {pick('Kembali ke FinTrack', 'Back to FinTrack')}</Link><LanguageSelect compact /></div>
        <h1 className="mt-6 text-3xl font-bold">{pick('Ketentuan Penggunaan', 'Terms of Use')}</h1>
        <p className="mt-2 text-sm text-gray-500">{pick('Terakhir diperbarui: 14 September 2026', 'Last updated: September 14, 2026')}</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-gray-700">
          <section><h2 className="text-lg font-semibold text-gray-900">{pick('Tujuan layanan', 'Purpose of the service')}</h2><p>{pick('FinTrack adalah alat pencatatan dan edukasi keuangan pribadi. Informasi, analisis, dan respons Chat Mentor bukan nasihat keuangan, pajak, atau investasi profesional.', 'FinTrack is a personal finance tracking and education tool. Information, analysis, and Mentor Chat responses are not professional financial, tax, or investment advice.')}</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">{pick('Tanggung jawab pengguna', 'User responsibilities')}</h2><p>{pick('Anda bertanggung jawab atas keakuratan data yang dimasukkan, keamanan password, dan keputusan yang dibuat berdasarkan informasi aplikasi. Periksa kembali hasil pemindaian struk dan perhitungan sebelum menggunakannya.', 'You are responsible for entered data, password security, and decisions based on app information. Review receipt scans and calculations before using them.')}</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">{pick('Penggunaan yang wajar', 'Acceptable use')}</h2><p>{pick('Jangan menggunakan layanan untuk aktivitas melanggar hukum, mencoba mengakses akun orang lain, mengganggu layanan, atau mengunggah konten berbahaya.', 'Do not use the service for unlawful activity, attempt to access another account, disrupt the service, or upload harmful content.')}</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">{pick('Ketersediaan', 'Availability')}</h2><p>{pick('Layanan dapat berubah, mengalami pemeliharaan, atau dibatasi oleh kuota penyedia hosting gratis. Kami berupaya menjaga data dan fungsi tetap tersedia, tetapi tidak menjamin layanan tanpa gangguan.', 'The service may change, undergo maintenance, or be limited by free hosting quotas. We aim to keep data and functions available but do not guarantee uninterrupted service.')}</p></section>
          <section><h2 className="text-lg font-semibold text-gray-900">{pick('Penghapusan akun', 'Account deletion')}</h2><p>{pick('Anda dapat menghapus akun dari halaman Profil. Tindakan tersebut menghapus data akun secara permanen dan tidak dapat dibatalkan.', 'You can delete your account from the Profile page. This permanently removes account data and cannot be undone.')}</p></section>
        </div>
      </article>
    </main>
  );
}
