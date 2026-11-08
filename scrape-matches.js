const playwright = require('playwright');
const fs = require('fs');

async function scrapeMatches() {
  const browser = await playwright.chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto('https://live-feed.net/tv-guide', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await page.waitForTimeout(5000);

    const lines = (await page.locator('body').innerText())
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const timePattern = /^(?:(?:0?[1-9]|1[0-2]):[0-5]\d\s*[AP]M|(?:[01]?\d|2[0-3]):[0-5]\d)$/i;
    const dateLabels = /^(?:today|tomorrow|next day|اليوم|غدًا|غدا)$/i;
    const matches = [];

    for (let i = 1; i < lines.length - 1; i++) {
      if (!timePattern.test(lines[i])) continue;

      const home = lines[i - 1];
      let awayIndex = i + 1;
      while (dateLabels.test(lines[awayIndex] || '')) awayIndex++;
      const away = lines[awayIndex];

      if (!home || !away || timePattern.test(away)) continue;

      const details = lines.slice(awayIndex + 1, awayIndex + 7);
      const commentator = details.find(line => line.startsWith('🎤')) || '';
      const channel = details.find(line =>
        !line.startsWith('🎤') &&
        !line.startsWith('🌐') &&
        !/^(?:Badrsat|Nilesat|\d{4,5}\s+[HV])/i.test(line)
      ) || '';

      matches.push({
        match: `${home} vs ${away}`,
        time: lines[i],
        channel,
        commentator: commentator.replace(/^🎤\s*/, '')
      });
    }

    // An empty result is more likely a changed page or selector than a valid update.
    if (matches.length === 0) {
      throw new Error(`No matches extracted from TV guide (body lines: ${lines.length}; sample: ${lines.slice(0, 20).join(' | ')})`);
    }

    const data = {
      updatedAt: new Date().toISOString(),
      source: 'live-feed.net',
      total: matches.length,
      matches
    };

    fs.writeFileSync('matches-data.json', JSON.stringify(data, null, 2));
    console.log('Matches saved:', matches.length);
  } finally {
    await browser.close();
  }
}

scrapeMatches().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
