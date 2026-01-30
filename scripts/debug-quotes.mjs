const tickers = [
  "MIL:ENEL",
  "NASDAQ:AAPL",
  "BME:GRF",
  "NASDAQ:NVDA",
  "NASDAQ:GOOGL",
  "NYSE:RL",
  "NASDAQ:MU",
  "BME:ANA",
  "NYSE:FSS",
  "BME:ROVI",
];

async function checkQuotes() {
  console.log("Checking quotes for:", tickers.join(", "));
  try {
    const res = await fetch(
      `http://localhost:3000/api/quotes?tickers=${tickers.join(",")}`,
    );
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));

    const missingDayChange = data.quotes.filter(
      (q) => q.dayChange === undefined,
    );
    if (missingDayChange.length > 0) {
      console.log(
        "Tickers missing dayChange:",
        missingDayChange.map((q) => q.ticker),
      );
    } else {
      console.log("All tickers have dayChange!");
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

checkQuotes();
