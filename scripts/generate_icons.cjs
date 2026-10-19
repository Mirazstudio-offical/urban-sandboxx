const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generate() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Full-bleed SVG suitable for iOS (no transparent rounded corners so iOS clips it naturally)
  const svgContentFullBleed = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- полноразмерная подложка без прозрачных углов для iOS -->
  <rect x="0" y="0" width="512" height="512" fill="#2d2b27"/>
  <rect x="16" y="16" width="480" height="480" rx="48" fill="#423e38" stroke="#c9922b" stroke-width="6" opacity="0.85"/>
  <rect x="28" y="28" width="456" height="456" rx="36" fill="none" stroke="#e0a93b" stroke-width="2" opacity="0.4"/>

  <!-- иконка: квадрат из 4 нод и балок (2D софт-боди) -->
  <g transform="translate(256 256)">
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M-120 -120 L120 -120 L120 120 L-120 120 Z" stroke="#121316" stroke-width="26"/>
      <path d="M-120 -120 L120 120" stroke="#121316" stroke-width="10" stroke-dasharray="20 18"/>
      <path d="M120 -120 L-120 120" stroke="#121316" stroke-width="10" stroke-dasharray="20 18"/>
    </g>
    <!-- ноды с красивым двойным свечением -->
    <circle cx="-120" cy="-120" r="42" fill="#e0a93b"/>
    <circle cx="-120" cy="-120" r="26" fill="#ffd166"/>
    
    <circle cx="120" cy="-120" r="42" fill="#e0a93b"/>
    <circle cx="120" cy="-120" r="26" fill="#ffd166"/>
    
    <circle cx="120" cy="120" r="42" fill="#e0a93b"/>
    <circle cx="120" cy="120" r="26" fill="#ffd166"/>
    
    <circle cx="-120" cy="120" r="42" fill="#e0a93b"/>
    <circle cx="-120" cy="120" r="26" fill="#ffd166"/>
    
    <circle cx="0" cy="0" r="18" fill="#e0a93b"/>
    <circle cx="0" cy="0" r="10" fill="#ffd166"/>
  </g>
</svg>
`;

  const sizes = [
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'apple-touch-icon-precomposed.png', size: 180 },
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 }
  ];

  for (const item of sizes) {
    await page.setViewport({ width: item.size, height: item.size, deviceScaleFactor: 1 });
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent;">${svgContentFullBleed}</body></html>`);
    
    // Scale SVG to fit viewport
    await page.addStyleTag({
      content: `svg { width: ${item.size}px; height: ${item.size}px; display: block; }`
    });

    const outPath = path.resolve(__dirname, '../public', item.name);
    await page.screenshot({ path: outPath, type: 'png', omitBackground: false });
    console.log(`Generated ${outPath} (${item.size}x${item.size})`);
  }

  await browser.close();
  console.log('Icon generation complete!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
