const playwright = require('playwright');
const fs = require('fs');

async function scrapeMatches() {
  const browser = await playwright.chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  try {
    await page.goto('https://live-feed.net/tv-guide', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    const text = await page.evaluate(() => document.body.innerText);

    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const matches = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const hasVs =
        line.includes(' vs ') ||
        line.includes('VS') ||
        line.includes('×') ||
        line.includes(' ضد ');

      if (hasVs) {
        matches.push({
          match: line,
          time: lines[i - 1] || '',
          channel: lines[i + 1] || '',
          commentator: lines[i + 2] || ''
        });
      }
    }

    const data = {
      updatedAt: new Date().toISOString(),
      source: 'live-feed.net',
      total: matches.length,
      matches
    };

    fs.writeFileSync(
      'matches-data.json',
      JSON.stringify(data, null, 2)
    );

    console.log('Matches saved:', matches.length);

  } catch (error) {
    console.error(error);
  }

  await browser.close();
}

scrapeMatches();
