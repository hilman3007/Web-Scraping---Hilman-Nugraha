import puppeteer from 'puppeteer';
import { extractDataFromHTMLBatch } from './groqClient.js';
import fs from 'fs';
import path from 'path';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getDescriptionFromDetailPage(browser, url) {
  const detailPage = await browser.newPage();
  try {
    await detailPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const description = await detailPage.$$eval('#viTabs_0_is table, .itemAttr', tables =>
      tables.map(t => t.innerText.trim()).join('\n\n')
    );

    return description && description.length > 30 ? description : '-';
  } catch (err) {
    console.log(`⚠️ Gagal membuka detail halaman: ${url}`);
    return '-';
  } finally {
    await detailPage.close();
  }
}

export async function scrapeEbay(keyword) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const hasilFilePath = path.resolve('hasil.json');

  let allNewResults = [];
  let pageNum = 1;

  while (true) {
    console.log(`Memulai Scraping Pada Page ${pageNum}`);
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_pgn=${pageNum}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const items = await page.$$eval('.s-item', nodes =>
      nodes.map(node => {
        const link = node.querySelector('a.s-item__link')?.href || '';
        return { html: node.outerHTML, url: link };
      }).filter(item => item.html)
    );

    const batchSize = 1;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const htmlOnly = batch.map(b => b.html);
      let success = false;
      let batchResults = [];

      while (!success) {
        try {
          await delay(4000);
          batchResults = await extractDataFromHTMLBatch(htmlOnly);

          // Cek deskripsi kosong → ambil dari halaman detail
          for (let j = 0; j < batchResults.length; j++) {
            const result = batchResults[j];
            if (result.description === '-' || result.description.length < 30) {
              const productURL = batch[j].url;
              if (productURL) {
                const detailDesc = await getDescriptionFromDetailPage(browser, productURL);
                result.description = detailDesc !== '-' ? detailDesc : result.description;
              }
            }
          }

          allNewResults.push(...batchResults);
          success = true;
        } catch (err) {
          const msg = err.response?.data?.error?.message || err.message;
          console.log(`❌ Groq API Error: ${msg}`);
          if (msg.includes('Rate limit') || msg.includes('TPM')) {
            const waitMatch = msg.match(/try again in (\d+(\.\d+)?)s/);
            const waitMs = waitMatch ? parseFloat(waitMatch[1]) * 1000 : 5000;
            console.log(`⏳ Menunggu ${Math.ceil(waitMs)}ms karena rate limit...`);
            await delay(waitMs);
          } else {
            break;
          }
        }
      }
    }

    const hasNext = await page.$('.pagination__next') !== null;
    if (!hasNext) {
      console.log('🚫 Tidak ada halaman selanjutnya, scraping dihentikan.');
      break;
    }

    pageNum++;
  }

  await browser.close();

  // 💾 Simpan hasil scraping ke hasil.json
  if (allNewResults.length > 0) {
    fs.writeFileSync(hasilFilePath, JSON.stringify(allNewResults, null, 2), 'utf-8');
    console.log(`✅ File hasil.json berhasil disimpan dengan ${allNewResults.length} produk`);
  } else {
    console.log('⚠️ Tidak ada produk valid untuk disimpan ke hasil.json');
  }

  console.log(`✅ Scraping telah selesai, masuk ke http://localhost:3000 untuk melihat hasil.`);
  return allNewResults;
}