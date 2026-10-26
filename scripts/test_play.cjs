const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[PAGE ${msg.type()}]`, msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  
  // Find buttons in MainMenu
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
  });
  console.log('Available buttons:', buttons);
  
  // Click resume or play or new game
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const playBtn = btns.find(b => 
      b.innerText.includes('ПРОДОЛЖИТЬ') || 
      b.innerText.includes('ИГРАТЬ') || 
      b.innerText.includes('НАЧАТЬ') ||
      b.innerText.includes('В ГОРОД')
    );
    if (playBtn) {
      playBtn.click();
      return playBtn.innerText;
    }
    return null;
  });
  console.log('Clicked button:', clicked);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Now check canvas pixel and error logs
  const check = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.cursor-crosshair');
    let pixel = null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      pixel = Array.from(ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data);
    }
    return {
      pixel,
      recentLogs: JSON.parse(sessionStorage.getItem('flatbody_heartbeat_watchdog_v1') || '{}').recentLogs
    };
  });
  
  console.log('Post-play check:', JSON.stringify(check, null, 2));
  await browser.close();
}

run().catch(console.error);
