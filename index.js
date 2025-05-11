import express from 'express';
import readline from 'readline';
import { scrapeEbay } from './scraper.js';

const app = express();
const PORT = 3000;
let currentKeyword = 'nike'; // default

// Input keyword dari user dulu
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Masukkan keyword pencarian produk di eBay: ', (keyword) => {
  currentKeyword = keyword.trim() || 'nike';
  const encodedKeyword = encodeURIComponent(currentKeyword);

  console.log(`\n✅ Keyword diset ke: "${currentKeyword}"`);
  console.log(`🟢 Server aktif di http://localhost:${PORT}`);
  console.log(`🌐 Buka di browser: http://localhost:${PORT}/scrape?keyword=${encodedKeyword}\n`);

  rl.close();

  // Mulai server setelah input
  app.listen(PORT, () => {
    // Server started
  });
});

// Endpoint
app.get('/scrape', async (req, res) => {
  const keyword = req.query.keyword || currentKeyword;
  try {
    const data = await scrapeEbay(keyword);
    res.json({ status: 'success', keyword, count: data.length, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Scraping failed', message: err.message });
  }
});

// Melihat Isi dari hasil.json
app.get('/', (req, res) => {
  const hasilPath = path.resolve('hasil.json');

  if (!fs.existsSync(hasilPath)) {
    return res.status(404).send('❌ File hasil.json belum ada. Silakan lakukan scraping dulu.');
  }

  const fileContent = fs.readFileSync(hasilPath, 'utf-8');
  try {
    const data = JSON.parse(fileContent);
    res.json({ count: data.length, data });
  } catch (err) {
    res.status(500).send('❌ Gagal membaca atau parsing hasil.json');
  }
});