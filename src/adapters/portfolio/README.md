# Portfolio P/L Module

Este módulo implementa una métrica principal de rentabilidad basada en `cost basis`, alineada con la lógica pública que suele explicarse en apps de corretaje como Revolut.

## Estructura

- `src/domain/portfolio`: tipos y errores del dominio.
- `src/calculations/portfolio`: funciones puras para posiciones, cartera y P&L por periodo.
- `src/adapters/portfolio`: dataset de ejemplo y utilidades de entrada.
- `tests/portfolio-calculations.test.ts`: tests unitarios.

## Fórmulas

- `buy_cost_base = quantity * price * fx_rate_to_base + buy_fee * fx_rate_to_base`
- `average_cost_per_unit_base = remaining_cost_basis_base / open_qty`
- `allocated_cost_base_on_sell = sold_qty * average_cost_per_unit_base_before_sell`
- `net_proceeds_base = sold_qty * sell_price * fx_rate_to_base - sell_fee * fx_rate_to_base`
- `realized_pnl_base = net_proceeds_base - allocated_cost_base_on_sell`
- `market_value_base = open_qty * last_price * current_fx_rate_to_base`
- `unrealized_pnl_base = market_value_base - remaining_cost_basis_base`
- `unrealized_return_pct = unrealized_pnl_base / remaining_cost_basis_base * 100`
- `portfolio_value_base = cash_balance_base + sum(open_position_market_value_base)`
- `net_pnl_period = realized_pnl_period + income_period - standalone_fees_period - taxes_period`
- `total_return_pct = total_return_base / historical_cost_basis_base * 100`

## Decisiones documentadas

- Método de `cost basis`: `weighted average cost`.
- Las fees de compra y venta quedan integradas en el coste o en el `net proceeds`; se reportan en `feesBase`, pero no se restan otra vez en `netPnLBase`.
- Los dividendos se consideran `income` neto de su fee asociado. Ese fee también aparece en `feesBase` para trazabilidad.
- `totalReturnPct` en `calculatePortfolioSummary` usa `historical cost basis` como denominador: `remaining cost basis` de posiciones abiertas + `allocated cost basis` ya realizado en ventas. Esto es más cercano a la idea pública de Revolut de usar `cost basis` para calcular retornos.
- El coste histórico usa `fxRateToBase` de cada operación. El valor de mercado usa `lastFxRateToBase` actual del activo. Esa diferencia puede generar variación por FX aunque el precio local no cambie.
- Si falta market data para una posición abierta, la función lanza error en vez de inventar valoración.

## Ejemplo de uso

```ts
import {
  calculatePeriodPnL,
  calculatePortfolioSummary,
  calculatePosition,
} from "@/calculations/portfolio";
import { buildSampleDataset } from "@/adapters/portfolio";

const dataset = buildSampleDataset();

const applePosition = calculatePosition(
  dataset.trades.filter((trade) => trade.assetSymbol === "AAPL"),
  dataset.marketData.find((asset) => asset.symbol === "AAPL")!,
  dataset.baseCurrency,
);

const summary = calculatePortfolioSummary(
  dataset.trades,
  dataset.dividends,
  dataset.cashTransactions,
  dataset.marketData,
  dataset.baseCurrency,
);

const periodPnL = calculatePeriodPnL(
  { from: "2026-02-01T00:00:00Z", to: "2026-03-31T23:59:59Z" },
  dataset.trades,
  dataset.dividends,
  dataset.cashTransactions,
  dataset.baseCurrency,
);
```

## Resultado del dataset de ejemplo

### Resumen de cartera

| Campo | Valor |
| --- | ---: |
| Base currency | EUR |
| Cash balance | 3121.13 |
| Invested cost basis | 2095.11 |
| Portfolio market value | 5479.93 |
| Unrealized P/L | 263.69 |
| Realized P/L all time | 197.93 |
| Income all time | 21.81 |
| Total return | 479.93 |
| Total return % | 15.36% |

### Posiciones abiertas

| Symbol | Open qty | Avg cost/unit base | Remaining cost basis | Market value | Unrealized P/L | Unrealized return |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| AAPL | 9 | 171.45666667 | 1543.11 | 1738.80 | 195.69 | 12.68% |
| SAN | 100 | 5.52 | 552.00 | 620.00 | 68.00 | 12.32% |

### P&L del periodo `2026-02-01` a `2026-03-31`

| Campo | Valor |
| --- | ---: |
| Realized P/L | 197.93 |
| Income | 21.81 |
| Fees | 5.40 |
| Taxes | 1.50 |
| Net P/L | 216.24 |
| Sell count | 1 |
| Dividend count | 2 |
