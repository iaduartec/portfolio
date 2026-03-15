import {
  Asset,
  CashTransaction,
  DividendTransaction,
  SampleDataset,
  Trade,
} from "@/domain/portfolio";

export const buildSampleDataset = (): SampleDataset => {
  const marketData: Asset[] = [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      currency: "USD",
      lastPrice: 210,
      lastFxRateToBase: 0.92,
    },
    {
      symbol: "SAN",
      name: "Banco Santander",
      currency: "EUR",
      lastPrice: 6.2,
      lastFxRateToBase: 1,
    },
  ];

  const trades: Trade[] = [
    {
      id: "t-001",
      assetSymbol: "AAPL",
      side: "BUY",
      quantity: 10,
      price: 180,
      fee: 1,
      currency: "USD",
      fxRateToBase: 0.9,
      executedAt: "2026-01-03T10:00:00Z",
    },
    {
      id: "t-002",
      assetSymbol: "AAPL",
      side: "BUY",
      quantity: 5,
      price: 200,
      fee: 1,
      currency: "USD",
      fxRateToBase: 0.95,
      executedAt: "2026-01-20T10:00:00Z",
    },
    {
      id: "t-003",
      assetSymbol: "AAPL",
      side: "SELL",
      quantity: 6,
      price: 220,
      fee: 1,
      currency: "USD",
      fxRateToBase: 0.93,
      executedAt: "2026-02-10T10:00:00Z",
    },
    {
      id: "t-004",
      assetSymbol: "SAN",
      side: "BUY",
      quantity: 100,
      price: 5.5,
      fee: 2,
      currency: "EUR",
      fxRateToBase: 1,
      executedAt: "2026-02-15T10:00:00Z",
    },
  ];

  const dividends: DividendTransaction[] = [
    {
      id: "d-001",
      assetSymbol: "AAPL",
      amount: 12,
      fee: 0.5,
      currency: "USD",
      fxRateToBase: 0.94,
      paidAt: "2026-02-20T10:00:00Z",
    },
    {
      id: "d-002",
      assetSymbol: "SAN",
      amount: 8,
      fee: 0,
      currency: "EUR",
      fxRateToBase: 1,
      paidAt: "2026-03-05T10:00:00Z",
    },
  ];

  const cashTransactions: CashTransaction[] = [
    {
      id: "c-001",
      type: "DEPOSIT",
      amount: 5000,
      currency: "EUR",
      fxRateToBase: 1,
      createdAt: "2026-01-02T10:00:00Z",
    },
    {
      id: "c-002",
      type: "INTEREST",
      amount: 3,
      currency: "EUR",
      fxRateToBase: 1,
      createdAt: "2026-02-25T10:00:00Z",
    },
    {
      id: "c-003",
      type: "FEE",
      amount: 2,
      currency: "EUR",
      fxRateToBase: 1,
      createdAt: "2026-02-26T10:00:00Z",
    },
    {
      id: "c-004",
      type: "TAX",
      amount: 1.5,
      currency: "EUR",
      fxRateToBase: 1,
      createdAt: "2026-03-01T10:00:00Z",
    },
  ];

  return {
    baseCurrency: "EUR",
    trades,
    dividends,
    cashTransactions,
    marketData,
  };
};
