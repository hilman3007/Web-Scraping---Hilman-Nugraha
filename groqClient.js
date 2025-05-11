import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function makeRequestWithRetry(payload, retries = 3) {
  try {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return res.data;
  } catch (err) {
    if (retries > 0 && err.code === 'ECONNRESET') {
      console.log('❌ Koneksi terputus, mencoba ulang...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      return makeRequestWithRetry(payload, retries - 1);
    }
    throw err;
  }
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export async function extractDataFromHTMLBatch(htmlArray) {
  const MAX_CHARS_PER_HTML = 10000;
  const chunkedHTML = chunkArray(htmlArray, 1); // 1 HTML per permintaan
  const allResults = [];

  for (let chunk of chunkedHTML) {
    const safeChunk = chunk.map(html =>
      html.length > MAX_CHARS_PER_HTML ? html.slice(0, MAX_CHARS_PER_HTML) : html
    );

    const prompt = `
    Tugas Anda adalah mengekstrak data dari HTML halaman produk eBay.

    Untuk setiap blok HTML, ekstrak:
    - title (judul produk, jika mengandung tanda kutip ganda, ubah jadi kutip satu atau hilangkan agar JSON tetap valid),
    - price (harga produk, pastikan termasuk simbol mata uang, seperti "$89.99" atau "IDR1,949,650". Jika tidak ditemukan, isi dengan "-"),
    - description (deskripsi produk; pastikan untuk mencari informasi lebih detail seperti "condition", "item specifics", atau bagian yang menyebutkan kondisi produk. Hindari hanya "brand new" atau "pre-owned" dan pastikan memberikan deskripsi lebih lengkap seperti fitur atau spesifikasi produk. Jika tidak ditemukan, isi dengan "-").

    Catatan:
    - Jangan masukkan data dari iklan, promosi, banner seperti "Shop on eBay", "Find great deals", dll.
    - Jawab hanya dalam format array JSON: [ { "title": "...", "price": "...", "description": "..." } ]

    Berikut blok HTML-nya:
    ${safeChunk.join('\n\n---\n\n')}
    `;

    const requestPayload = {
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: 'Kamu hanya merespons dengan array JSON saja.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    };

    try {
      const data = await makeRequestWithRetry(requestPayload);
      const content = data.choices[0].message.content;
      const match = content.match(/\[[\s\S]*?\]/);

      if (!match) {
        console.log('❌ Tidak ditemukan array JSON di respon Groq!');
        console.log('📝 Konten mentah:\n', content);
        continue;
      }

      let parsed;
      try {
        let cleanedJSON = match[0]
          .replace(/\\n/g, ' ')
          .replace(/\\"/g, "'")
          .replace(/"([^"]*?)":/g, (m, p1) => `"${p1.replace(/"/g, "'")}":`)
          .replace(/"([^"]*?)"/g, (m, p1) => `"${p1.replace(/"/g, "'")}"`)
          .replace(/[\u0000-\u001F\u007F]/g, '');

        parsed = JSON.parse(cleanedJSON);
      } catch (parseErr) {
        console.log('❌ Gagal parsing JSON setelah dibersihkan:', parseErr.message);
        console.log('🧪 JSON mentah dibersihkan:\n', match[0]);
        continue;
      }

      const filtered = parsed.filter(item => {
        const title = (item.title || '').toLowerCase().trim();
        const isPromo = [
          'shop on ebay',
          'great deals',
          'daily deals',
          'visit store',
          'find deals'
        ].some(p => title.includes(p));
        return !isPromo && title.length > 5;
      });

      if (filtered.length === 0) {
        //console.log('⚠️ Semua data kosong/tidak valid, dilewati.');
        continue;
      }

      filtered.forEach(item => {
        item.title = (item.title || '').replace(/"/g, "'").trim();
        item.price = (item.price || '-').trim();
        item.description = (item.description || '-').replace(/"/g, "'").trim();

        if (item.description === '-' || item.description.toLowerCase() === 'brand new' || item.description.length < 20) {
          item.description = '-';
        }
      });

      allResults.push(...filtered);
    } catch (err) {
      console.log('❌ Groq API Error:', err.response?.data || err.message);
      continue;
    }
  }

  return allResults;
}