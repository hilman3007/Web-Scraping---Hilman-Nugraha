## Author: Hilman Nugraha

---------------------------------------------

# 💼 eBay Product Scraper API

Scraper ini menggunakan **Puppeteer** dan **Groq API** untuk mengambil data produk dari eBay berdasarkan keyword yang diberikan. Hasil scraping disimpan ke dalam `hasil.json` dan dapat diakses melalui API.

---------------------------------------------

## 🚀 Fitur

* Scraping produk dari eBay berdasarkan keyword.
* Ekstraksi informasi produk (judul, harga, deskripsi) menggunakan Groq (LLaMA 3).
* Menyimpan hasil ke `hasil.json` secara otomatis.
* API endpoint untuk:

  * Scrape berdasarkan keyword.
  * Menampilkan isi `hasil.json`.

---------------------------------------------

## 🧰 Teknologi

* Node.js
* Puppeteer
* Express.js
* Groq API (LLaMA 3 via `chat/completions`)
* dotenv

---------------------------------------------

## 📦 Instalasi

1. **Clone repository**:

   ```bash
   git clone <url-repo-anda>
   cd nama-folder
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Buat file `.env`**:

   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

---------------------------------------------

## ▶️ Menjalankan Aplikasi

```bash
npm start
```

Kemudian akan muncul prompt:

```
Masukkan keyword pencarian produk di eBay:
```

Masukkan kata kunci seperti `nike`, `laptop`, `lego`, dll.

Contoh output:

```
✅ Keyword diset ke: "nike"
🟢 Server aktif di http://localhost:3000
🌐 Buka di browser untuk mulai scraping: http://localhost:3000/scrape?keyword=nike
```

---------------------------------------------

## 📡 Endpoint API

### `GET /scrape?keyword=...`

Melakukan scraping produk eBay berdasarkan keyword dan menyimpan hasil ke `hasil.json`.

**Contoh:**

```
http://localhost:3000/scrape?keyword=lego
```

### `GET /`

Menampilkan isi dari file `hasil.json` (jika sudah ada).

**Contoh:**

```
http://localhost:3000/
```

---

## 📁 Struktur Proyek

```
.
├── index.js               # Main server & endpoint
├── scraper.js             # Logic scraping eBay dan menyimpan hasil
├── groqClient.js          # Mengirim prompt ke Groq API dan parsing hasil
├── hasil.json             # Hasil scraping produk (dibuat otomatis)
├── .env                   # API key untuk Groq
└── README.md              # Dokumentasi
```

---------------------------------------------

## ⚠️ Catatan

* Pastikan koneksi internet stabil karena scraping dan pemanggilan Groq API dilakukan berulang.
* Rate limit pada Groq dapat menyebabkan penundaan scraping.
* Data yang diambil hanya untuk keperluan edukasi atau riset — **bukan untuk tujuan komersial tanpa izin**.

---------------------------------------------

## 📜 Lisensi

Proyek ini bebas digunakan untuk tujuan pembelajaran. Untuk penggunaan lain, harap cantumkan atribusi yang sesuai.
