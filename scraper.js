const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeStream() {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        let streamUrl = '';

        page.on('request', (request) => {
            const url = request.url();
            if (url.includes('.m3u8')) {
                streamUrl = url;
            }
        });

        await page.goto('https://stream2.zoloj.com/player?lang=tamil', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 6000));

        if (!streamUrl) {
            const html = await page.content();
            const match = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
            if (match) streamUrl = match[0];
        }

        await browser.close();

        if (streamUrl) {
            const data = { success: true, url: streamUrl, updated_at: new Date().toISOString() };
            fs.writeFileSync('stream.json', JSON.stringify(data, null, 2));
            console.log("Stream URL saved successfully:", streamUrl);
        } else {
            console.log("Stream URL not found");
        }
    } catch (error) {
        if (browser) await browser.close();
        console.error("Error:", error);
    }
}

scrape.js();
