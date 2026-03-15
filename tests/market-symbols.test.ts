import test from "node:test";
import assert from "node:assert/strict";

import { resolveTradingViewSymbol, resolveYahooSymbol } from "@/lib/marketSymbols";

test("mapea ETFs del robo advisor a XETR de forma explicita", () => {
  assert.equal(resolveTradingViewSymbol("AMEM"), "XETR:AMEM");
  assert.equal(resolveTradingViewSymbol("DBXJ"), "XETR:DBXJ");
  assert.equal(resolveTradingViewSymbol("IS3Q"), "XETR:IS3Q");
  assert.equal(resolveTradingViewSymbol("2B72"), "XETR:2B72");
});

test("resuelve sufijo yahoo .DE para ETFs europeos del robo", () => {
  assert.equal(resolveYahooSymbol("AMEM", { XETR: ".DE" }), "AMEM.DE");
  assert.equal(resolveYahooSymbol("EBUY", { XETR: ".DE" }), "EBUY.DE");
  assert.equal(resolveYahooSymbol("79U0", { XETR: ".DE" }), "79U0.DE");
});
