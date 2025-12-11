import pandas as pd
import numpy as np
import glob
import yfinance as yf

# ==========================
# VERSIÓN SIN API (Yahoo Finance)
# No requiere registro ni API keys
# ==========================

print("📊 Simulador de Portfolio Revolut")
print("Usando Yahoo Finance para precios (sin necesidad de API keys)")
print("=" * 60)
print()

# ==========================
# 1) LEER CSV DE REVOLUT
# ==========================

files = glob.glob("revolut*.csv")
if not files:
    raise SystemExit("No se han encontrado ficheros 'revolut*.csv' en la carpeta actual.")

dfs = []
for f in files:
    print(f"📄 Leyendo: {f}")
    dfs.append(pd.read_csv(f))

df = pd.concat(dfs, ignore_index=True)
print(f"✅ {len(df)} operaciones encontradas")
print()

# ==========================
# 2) FUNCIONES AUXILIARES
# ==========================

def parse_money(x):
    """
    Convierte 'EUR 49.73' o 'USD 159' -> 49.73 / 159.0
    """
    if pd.isna(x):
        return None
    if isinstance(x, str):
        parts = x.split()
        if len(parts) == 2:
            num = parts[1].replace(",", "")
        else:
            num = x.replace(",", "")
        try:
            return float(num)
        except ValueError:
            return None
    return x

def map_side(t):
    if isinstance(t, str):
        if "BUY" in t:
            return "buy"
        if "SELL" in t:
            return "sell"
    return None

def map_order_type(t):
    if not isinstance(t, str):
        return None
    if "MARKET" in t:
        return "market"
    if "LIMIT" in t:
        return "limit"
    if "STOP" in t:
        return "stop"
    return "unknown"

# ==========================
# 3) PROCESAR TIPOS DE OPERACIONES
# ==========================

# 3.1 TRADES (BUY/SELL)
mask_trades = df["Type"].str.contains("BUY", na=False) | df["Type"].str.contains("SELL", na=False)
trades = df[mask_trades].copy()

if not trades.empty:
    trades["side"] = trades["Type"].apply(map_side)
    trades["order_type"] = trades["Type"].apply(map_order_type)
    trades["qty"] = trades["Quantity"].astype(float)
    trades["price"] = trades["Price per share"].apply(parse_money)
    trades["notional"] = trades["Total Amount"].apply(parse_money)

    # qty firmada: +qty si buy, -qty si sell
    trades["side_sign"] = np.where(trades["side"] == "buy", 1, -1)
    trades["qty_signed"] = trades["qty"] * trades["side_sign"]

    # coste neto: +notional si buy, -notional si sell
    trades["cost_signed"] = trades["notional"] * trades["side_sign"]
else:
    print("⚠️ No se encontraron operaciones de compra/venta.")
    trades = pd.DataFrame(columns=["Ticker", "Currency", "qty_signed", "cost_signed"])

# 3.2 DIVIDENDOS, FEES E IMPUESTOS
# Buscamos filas que NO sean trades ni Cash Top-Up/Withdrawal
mask_others = ~mask_trades & ~df["Type"].str.contains("CASH", na=False)
others = df[mask_others].copy()
others["amount"] = others["Total Amount"].apply(parse_money)

# Clasificar tipos de flujo de caja
def classify_cashflow(t):
    t = str(t).upper()
    if "DIVIDEND TAX" in t or "WITHHOLDING" in t:
        return "TAX"
    if "DIVIDEND" in t:
        return "DIVIDEND"
    if "FEE" in t:
        return "FEE"
    return "OTHER"

others["category"] = others["Type"].apply(classify_cashflow)

# Agrupar flujos de caja por divisa
cashflow_summary = others.groupby(["Currency", "category"])["amount"].sum().unstack(fill_value=0)

# ==========================
# 4) POSICIÓN FINAL POR TICKER
# ==========================

positions = trades.groupby(["Ticker", "Currency"], as_index=False).agg(
    qty_total=("qty_signed", "sum"),
    cost_net=("cost_signed", "sum"),
)

# Eliminar posiciones residuales casi cero (por redondeos)
# Pero MANTENER las que tienen cost_net != 0 (pérdidas/ganancias realizadas de posiciones cerradas)
# Si qty es 0 pero cost_net no, es PnL realizado.
positions["is_open"] = positions["qty_total"].abs() > 1e-6

positions.rename(columns={"Ticker": "symbol"}, inplace=True)

# ==========================
# 5) OBTENER PRECIOS CON YAHOO FINANCE
# ==========================

def get_last_price(symbol):
    """
    Obtiene el último precio usando Yahoo Finance.
    Intenta con múltiples sufijos para ETFs europeos.
    """
    # 1. Mapeo manual de Tickers Revolut -> Yahoo Finance
    REVOLUT_TO_YAHOO = {
        "ENL": "ENEL.MI",   # Enel (Milan)
        "41L": "ROVI.MC",   # Rovi (Madrid)
        "AJ3": "ANA.MC",    # Acciona (Madrid)
        "OZTA": "GRF.MC",   # Grifols (Madrid)
        "VHM": "SCYR.MC",   # Sacyr (Madrid)
    }

    if symbol in REVOLUT_TO_YAHOO:
        symbol = REVOLUT_TO_YAHOO[symbol]
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d")
            if not hist.empty:
                return hist['Close'].iloc[-1], symbol
        except Exception:
            pass

    # Sufijos a intentar
    suffixes = [".DE", ".MC", ".MI", ".PA", ".AS", ".SW", ".L", ""]

    for suffix in suffixes:
        try:
            test_symbol = symbol + suffix
            ticker = yf.Ticker(test_symbol)
            hist = ticker.history(period="5d")
            if not hist.empty:
                return hist['Close'].iloc[-1], test_symbol
        except Exception:
            continue

    return None, None

# Solo buscamos precios para posiciones ABIERTAS
open_positions = positions[positions["is_open"]].copy()
symbols = open_positions["symbol"].unique()
prices = {}
found_symbols = {}

print("💰 Obteniendo precios para posiciones abiertas...")

for sym in symbols:
    price, found_sym = get_last_price(sym)
    prices[sym] = price
    found_symbols[sym] = found_sym
    if price:
        print(f"  ✅ {sym} -> {found_sym}: {price:.2f}")
    else:
        print(f"  ⚠️  {sym}: Precio no encontrado")

print()

positions["last_price"] = positions["symbol"].map(prices)
positions["yahoo_symbol"] = positions["symbol"].map(found_symbols)

# ==========================
# 6) CÁLCULOS DE SIMULACIÓN
# ==========================

# Valor de mercado (solo para abiertas)
positions["market_value"] = np.where(
    positions["is_open"],
    positions["qty_total"] * positions["last_price"],
    0.0
)

# PnL Total (Realizado + No Realizado)
# PnL = Valor Mercado - Coste Neto
# Coste Neto = (Dinero gastado en compras) - (Dinero recibido en ventas)
# Si vendo todo: Valor Mercado = 0. PnL = -(Compras - Ventas) = Ventas - Compras. Correcto.
positions["total_pnl"] = positions["market_value"] - positions["cost_net"]

# Rentabilidad % (solo para abiertas tiene sentido visualmente, o sobre el capital invertido)
positions["return_pct"] = np.where(
    positions["cost_net"] != 0,
    positions["total_pnl"] / positions["cost_net"] * 100.0,
    0.0
)

# ==========================
# 7) GUARDAR RESULTADO
# ==========================

output_file = "simulacion_portfolio.csv"
positions.to_csv(output_file, index=False)

print("=" * 60)
print("📊 DETALLE POR ACTIVO")
print("=" * 60)

for idx, row in positions.iterrows():
    sym = row['symbol']
    curr = row['Currency']

    # Si está cerrada
    if not row['is_open']:
        if abs(row['total_pnl']) > 0.01: # Solo mostrar si hubo ganancia/pérdida relevante
            print(f"🏁 {sym} ({curr}) [CERRADA]")
            print(f"   PnL Realizado: {row['total_pnl']:.2f}")
            print()
        continue

    # Si está abierta
    symbol_display = f"{sym}"
    if pd.notna(row['yahoo_symbol']) and row['yahoo_symbol'] != sym:
        symbol_display += f" ({row['yahoo_symbol']})"

    print(f"🔹 {symbol_display} ({curr})")
    print(f"   Cantidad: {row['qty_total']:.2f}")
    print(f"   Coste Neto: {row['cost_net']:.2f} (Inversión viva)")

    if pd.notna(row['last_price']):
        print(f"   Valor Mercado: {row['market_value']:.2f}")
        pnl_sign = "🟢" if row['total_pnl'] >= 0 else "🔴"
        print(f"   {pnl_sign} PnL Total: {row['total_pnl']:.2f} ({row['return_pct']:.2f}%)")
        print(f"   ⚠️  Precio no disponible")
    print()

# ==========================
# 8) INFORME FINANCIERO Y FISCAL
# ==========================

print("=" * 60)
print("💰 INFORME FINANCIERO Y FISCAL (ESTIMADO)")
print("=" * 60)

# Obtener tipo de cambio actual USD -> EUR
try:
    fx_ticker = yf.Ticker("EUR=X")
    fx_hist = fx_ticker.history(period="1d")
    usd_to_eur = fx_hist['Close'].iloc[-1]
except:
    usd_to_eur = 0.95 # Fallback conservador si falla Yahoo
    print("⚠️ No se pudo obtener FX rate. Usando estimado 0.95")

print(f"ℹ️  Tipo de cambio aplicado: 1 USD = {usd_to_eur:.4f} EUR")
print("-" * 60)

# Agrupar PnL de trading por divisa
trading_pnl = positions.groupby("Currency")["total_pnl"].sum()

total_profit_eur = 0

currencies = set(trading_pnl.index) | set(cashflow_summary.index)

for curr in currencies:
    t_pnl = trading_pnl.get(curr, 0)
    divs = cashflow_summary.loc[curr, "DIVIDEND"] if curr in cashflow_summary.index and "DIVIDEND" in cashflow_summary.columns else 0
    fees = cashflow_summary.loc[curr, "FEE"] if curr in cashflow_summary.index and "FEE" in cashflow_summary.columns else 0
    taxes_paid = cashflow_summary.loc[curr, "TAX"] if curr in cashflow_summary.index and "TAX" in cashflow_summary.columns else 0

    net_profit_local = t_pnl + divs + fees + taxes_paid

    # Convertir a EUR para el total
    if curr == "USD":
        net_profit_eur = net_profit_local * usd_to_eur
    else:
        net_profit_eur = net_profit_local

    total_profit_eur += net_profit_eur

    print(f"[{curr}] Beneficio Bruto: {net_profit_local:>10.2f} {curr}")

print("=" * 60)
print(f"💶 BENEFICIO TOTAL (en EUR):       {total_profit_eur:>10.2f} €")

# CÁLCULO DE IMPUESTOS (Hacienda España)
# Base imponible del ahorro
# Tramo 1: 19% hasta 6.000€
tax_rate = 0.19
estimated_tax = 0

if total_profit_eur > 0:
    estimated_tax = total_profit_eur * tax_rate
    print(f"🏛️  Hacienda (Est. 19%):            -{estimated_tax:>10.2f} €")
    print("-" * 60)
    final_net = total_profit_eur - estimated_tax
    print(f"✅ BENEFICIO NETO FINAL:           {final_net:>10.2f} €")
    print(f"   (Lo que te queda limpio)")
else:
    print("📉 No hay beneficios sujetos a impuestos (Pérdidas).")
    print("   Puedes compensar estas pérdidas con ganancias futuras (4 años).")

print("=" * 60)
print(f"✅ Archivo guardado: {output_file}")
print("=" * 60)
