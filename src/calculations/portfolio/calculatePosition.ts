import { Asset, CurrencyCode, Position, Trade } from "@/domain/portfolio";

import { buildPositionFromLedger, buildTradeLedger } from "./shared";

export const calculatePosition = (
  transactions: readonly Trade[],
  assetMarketData: Asset,
  baseCurrency: CurrencyCode,
): Position => {
  const ledger = buildTradeLedger(transactions, baseCurrency);
  return buildPositionFromLedger(assetMarketData, ledger, baseCurrency);
};
