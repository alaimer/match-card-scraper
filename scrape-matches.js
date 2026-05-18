const playwright = require('playwright');
const fs = require('fs');

async function scrapeMatches() {
  const browser = await playwright.chromium.launch({
    headless: true
  });

  try {
    const page = await browser.newPage();

    await page.goto('https://live-feed.net/tv-guide', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    const text = await page.evaluate(() => document.body.innerText);

    const data = {
      updatedAt: new Date().toISOString(),
      source: 'live-feed.net',
      matches: [],
      preview: text.slice(0, 3000)
    };

    fs.writeFileSync(
      'matches-data.json',
      JSON.stringify(data, null, 2)
    );

    console.log('Done');
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
}

scrapeMatches();
