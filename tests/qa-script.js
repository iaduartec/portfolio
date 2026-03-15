import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const requests = [];
  page.on('request', request => requests.push(request.url()));

  console.log('--- Navigating to /portfolio ---');
  await page.goto('http://localhost:3000/portfolio', { waitUntil: 'networkidle' });

  console.log('1. Checking alphavantage requests from client...');
  const alphaRequests = requests.filter(url => url.includes('alphavantage.co'));
  if (alphaRequests.length === 0) {
    console.log('✅ No client-side request made to alphavantage.co');
  } else {
    console.log('❌ Found alphavantage requests:', alphaRequests);
  }

  // Also query the OHLC endpoint to see if it responds fast and without error
  console.log('1b. Querying /api/market/ohlc to see if it responds ok...');
  const ohlcResponse = await page.request.get('http://localhost:3000/api/market/ohlc?ticker=AAPL&range=1y');
  if (ohlcResponse.ok()) {
     console.log('✅ /api/market/ohlc executed successfully.');
  }

  console.log('2. Checking footer text for accents...');
  const footerText = await page.locator('footer').innerText();
  if (footerText.includes('inversión') && footerText.includes('visualización')) {
    console.log('✅ Footer has correctly accented "inversión" and "visualización".');
  } else {
    console.log('❌ Footer is missing correct accents. Found text:', footerText);
  }

  console.log('3. Checking Revolut disclaimer...');
  // Check if anything mentions Revolut under the allocation or generally on page (besides standard Revolut icon)
  const hasRevolutText = await page.evaluate(() => {
    return document.body.innerText.includes('Este dashboard asume que todas las transacciones provienen primariamente del formato de exportación de Revolut');
  });
  if (!hasRevolutText) {
    console.log('✅ Revolut disclaimer has been removed.');
  } else {
    console.log('❌ Revolut disclaimer is still present.');
  }

  console.log('4. Checking shadow-panel utility on hero section...');
  // The hero section in Portfolio typically has a gradient/shadow. We can find the element with .shadow-panel and get computed box shadow
  const hasShadowPanelClass = await page.locator('.shadow-panel').count();
  if (hasShadowPanelClass > 0) {
    console.log(`✅ Found ${hasShadowPanelClass} elements with .shadow-panel class.`);
    // Verify computed style of the first one
    const computedShadow = await page.locator('.shadow-panel').first().evaluate(el => window.getComputedStyle(el).boxShadow);
    if (computedShadow !== 'none' && computedShadow !== '') {
      console.log('✅ Box shadow renders correctly:', computedShadow);
    } else {
      console.log('❌ Box shadow is empty or none on .shadow-panel element:', computedShadow);
    }
  } else {
    console.log('❌ No element with .shadow-panel class found.');
  }

  await browser.close();
})();
