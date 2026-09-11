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

        // Capture all network requests to find .m3u8 or video manifests
        page.on('request', (request) => {
            const url = request.url();
            if (url.includes('.m3u8') || url.includes('.ts') || url.includes('playlist')) {
                console.log("Captured potential stream URL:", url);
                if (url.includes('.m3u8')) {
                    streamUrl = url;
                }
            }
        });

        console.log("Navigating to target site...");
        await page.goto('https://stream2.zoloj.com/player?lang=tamil', { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Wait longer for video player and scripts to load fully
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Fallback: search inside page content if network event missed it
        if (!streamUrl) {
            console.log("Checking page content for stream links...");
            const html = await page.content();
            const match = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
            if (match) {
                streamUrl = match[0];
            }
        }

        await browser.close();

        if (streamUrl) {
            const data = { success: true, url: streamUrl, updated_at: new Date().toISOString() };
            fs.writeFileSync('stream.json', JSON.stringify(data, null, 2));
            console.log("Stream URL saved successfully:", streamUrl);
        } else {
            console.log("Stream URL not found after deep scan");
            // Save empty/error state so json exists for pages
            const data = { success: false, url: "", updated_at: new Date().toISOString() };
            fs.writeFileSync('stream.json', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        if (browser) await browser.close();
        console.error("Error during scraping:", error);
    }
}

scrapeStream();
