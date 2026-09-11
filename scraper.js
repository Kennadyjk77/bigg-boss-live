const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeStream() {
    let browser;
    try {
        console.log("Launching browser...");
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        let streamUrl = '';

        // Network request capture for m3u8
        page.on('request', (request) => {
            const url = request.url();
            if (url.includes('.m3u8')) {
                streamUrl = url;
            }
        });

        console.log("Navigating to target site...");
        await page.goto('https://stream2.zoloj.com/player?lang=tamil', { waitUntil: 'networkidle2', timeout: 60000 });
        
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Fallback: evaluate page elements or global JS variables if any exist
        if (!streamUrl) {
            streamUrl = await page.evaluate(() => {
                // Check if video source is directly in a video tag or player instance
                const video = document.querySelector('video');
                if (video && video.src) return video.src;
                
                // Search scripts for m3u8 url
                const scripts = Array.from(document.querySelectorAll('script'));
                for (let script of scripts) {
                    const match = script.textContent.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
                    if (match) return match[0];
                }
                return '';
            });
        }

        await browser.close();

        if (streamUrl) {
            const data = { success: true, url: streamUrl, updated_at: new Date().toISOString() };
            fs.writeFileSync('stream.json', JSON.stringify(data, null, 2));
            console.log("Stream URL saved successfully:", streamUrl);
        } else {
            console.log("Stream URL not found, using fallback pattern");
            // If automated grab fails temporarily, keep structure safe
            const data = { success: false, url: "", updated_at: new Date().toISOString() };
            fs.writeFileSync('stream.json', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        if (browser) await browser.close();
        console.error("Error during scraping:", error);
    }
}

scrapeStream();
