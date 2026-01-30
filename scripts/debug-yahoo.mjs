const symbol = "AAPL";
const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;

async function debugYahoo() {
  console.log("Fetching Yahoo data for:", symbol);
  try {
    const res = await fetch(url);
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    console.log("Meta:", JSON.stringify(result?.meta, null, 2));

    const meta = result?.meta;
    const prevClose = meta?.previousClose;
    const chartPreviousClose = meta?.chartPreviousClose;
    const regularMarketPreviousClose = meta?.regularMarketPreviousClose;

    console.log("Values found:");
    console.log("- previousClose:", prevClose);
    console.log("- chartPreviousClose:", chartPreviousClose);
    console.log("- regularMarketPreviousClose:", regularMarketPreviousClose);
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

debugYahoo();
