# FinTrack Mentor

Aplikasi pencatatan keuangan berbasis akun dengan React, FastAPI, SQLAlchemy,
JWT, dan SQLite untuk development. PostgreSQL dapat digunakan melalui
`DATABASE_URL` tanpa mengubah kode aplikasi.

## Menjalankan backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Pastikan `http://127.0.0.1:8000/health` mengembalikan `{"ok": true, ...}`.
Ganti `JWT_SECRET_KEY` di `.env` sebelum aplikasi digunakan di luar komputer
lokal.

Fitur lupa password mengirim link melalui SMTP. Isi `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USERNAME`, `SMTP_PASSWORD`, dan `SMTP_FROM_EMAIL` di `backend/.env`.
`FRONTEND_URL` harus menunjuk ke alamat frontend yang dapat dibuka pengguna.
Jika SMTP belum dikonfigurasi, halaman lupa password akan menampilkan bahwa
layanan email belum siap alih-alih memberikan status pengiriman yang palsu.
Untuk development lokal tanpa SMTP, set `PASSWORD_RESET_DEV_MODE=true`. Link
reset kemudian ditampilkan langsung di halaman. Jangan aktifkan opsi ini pada
deployment publik.

## Menjalankan frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Buka `http://localhost:5173`, buat akun, lalu login. Pengeluaran, budget,
transaksi saham, dividen, dan daily report disimpan di database dan hanya dapat
diakses oleh pemilik akun.

Halaman Portofolio juga mendukung pencatatan instrumen generik seperti ETF,
reksa dana, obligasi, deposito, kas, kripto, emas, komoditas, properti, bisnis,
private equity, P2P lending, dana pensiun, koleksi, forex, dan derivatif. Nilai
aset mata uang asing dinormalisasi ke IDR menggunakan kurs yang diisi user.
Health score 0–100 dihitung secara deterministik dari diversifikasi,
konsentrasi, likuiditas, dan keseimbangan risiko. Skor ini bersifat edukatif,
bukan rekomendasi investasi.

Halaman Keuangan mendukung pemasukan, pengeluaran, pencarian history, filter,
dan foto struk JPG/PNG/WebP hingga 5 MB. File struk disimpan di
`backend/uploads/receipts` dan hanya diberikan melalui endpoint yang memeriksa
token serta kepemilikan transaksi.

Ketika foto dipilih, fitur scan struk membaca tanggal, total, merchant, metode
pembayaran, kategori, item, pajak, diskon, dan teks yang terlihat menggunakan
Tesseract OCR lokal lalu mengisi form secara otomatis. Foto struk tidak dikirim
ke layanan AI eksternal. Server harus memiliki executable `tesseract`; pada
macOS dapat dipasang dengan `brew install tesseract`.
Untuk struk terlipat, user dapat memilih hingga empat foto dari struk yang sama
(foto penuh dan close-up bagian yang tertutup/lipatan). Sistem menggabungkan
semua foto menjadi satu hasil transaksi; foto pertama menjadi lampiran utama.

## Verifikasi

```bash
cd backend
source .venv/bin/activate
python -m unittest -v
```

```bash
cd frontend
npm run typecheck
npm run build
```
