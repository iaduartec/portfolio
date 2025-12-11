import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from src.ingestion.loader import load_data, get_ticker_metadata, get_current_prices, get_usd_eur_rate, parse_money, get_historical_prices
from src.analysis.metrics import calculate_position_metrics, convert_currency, calculate_portfolio_performance
from src.prediction.monte_carlo import run_monte_carlo_simulation, get_simulation_stats

# Configuración de la página
st.set_page_config(
    page_title="Simulador de Portfolio",
    page_icon="📈",
    layout="wide"
)

# ==========================
# INTERFAZ DE USUARIO
# ==========================

st.title("💎 Simulador de Portfolio Premium")

# Cargar datos
df = load_data()
if df is None:
    st.error("No se encontraron archivos CSV.")
    st.stop()

# Procesar datos (Trades)
mask_trades = df["Type"].str.contains("BUY", na=False) | df["Type"].str.contains("SELL", na=False)
trades = df[mask_trades].copy()

if trades.empty:
    st.warning("No hay operaciones.")
    st.stop()

trades["side"] = trades["Type"].apply(lambda x: "buy" if "BUY" in str(x) else "sell")
trades["qty"] = trades["Quantity"].astype(float)
trades["notional"] = trades["Total Amount"].apply(parse_money)
trades["side_sign"] = np.where(trades["side"] == "buy", 1, -1)
trades["qty_signed"] = trades["qty"] * trades["side_sign"]
trades["cost_signed"] = trades["notional"] * trades["side_sign"]

# Agrupar posiciones
positions = trades.groupby(["Ticker", "Currency"], as_index=False).agg(
    qty_total=("qty_signed", "sum"),
    cost_net=("cost_signed", "sum"),
)
positions["is_open"] = positions["qty_total"].abs() > 1e-6
positions.rename(columns={"Ticker": "symbol"}, inplace=True)

# Obtener datos externos
unique_symbols = positions["symbol"].unique()
if 'metadata' not in st.session_state:
    st.session_state.metadata = get_ticker_metadata(unique_symbols)
if 'prices' not in st.session_state:
    st.session_state.prices = get_current_prices(unique_symbols)
    st.session_state.fx_rate = get_usd_eur_rate()

# Datos Históricos para análisis avanzado
if 'history' not in st.session_state:
    st.session_state.history = get_historical_prices(unique_symbols)

# ==========================
# SIDEBAR & CONFIG
# ==========================
with st.sidebar:
    st.header("⚙️ Configuración")
    base_currency = st.selectbox("Divisa Base", ["EUR", "USD"])
    tax_rate = st.slider("IRPF (%)", 0, 50, 19) / 100
    st.divider()
    st.caption(f"FX Rate: 1 USD = {st.session_state.fx_rate:.4f} EUR")


# Enriquecer Dataframe y Cálculos (Usando src.analysis.metrics)
positions = calculate_position_metrics(positions, st.session_state.prices, st.session_state.metadata)

# Re-run conversion with selected base_currency
positions = convert_currency(positions, st.session_state.fx_rate, base_currency)

# ==========================
# PESTAÑAS
# ==========================
tab1, tab2, tab3, tab4 = st.tabs(["📊 Portfolio Actual", "🔮 Simulador What-If", "📜 Histórico y Fiscal", "🧠 Análisis AI"])

with tab1:
    # KPIs Principales
    total_value = positions["value_base"].sum()
    total_pnl = positions["pnl_base"].sum()
    invested = total_value - total_pnl

    kpi1, kpi2, kpi3 = st.columns(3)
    kpi1.metric("💰 Valor Actual", f"{total_value:,.2f} {base_currency}")
    kpi2.metric("🚀 Beneficio Total", f"{total_pnl:,.2f} {base_currency}", f"{(total_pnl/invested*100):.2f}%")
    kpi3.metric("💼 Capital Invertido", f"{invested:,.2f} {base_currency}")

    st.divider()

    # Tabla Visual con Logos
    st.subheader("📂 Tu Cartera")

    # Filtrar solo abiertas para la tabla principal
    df_display = positions[positions["is_open"]].copy()
    df_display = df_display[["logo", "name", "symbol", "qty_total", "last_price", "market_value", "total_pnl", "return_pct", "Currency", "value_base", "pnl_base"]]

    st.dataframe(
        df_display,
        column_config={
            "logo": st.column_config.ImageColumn("Logo", width="small"),
            "name": "Empresa",
            "symbol": "Ticker",
            "qty_total": st.column_config.NumberColumn("Cantidad", format="%.4f"),
            "last_price": st.column_config.NumberColumn("Precio", format="%.2f"),
            "market_value": st.column_config.NumberColumn("Valor", format="%.2f"),
            "total_pnl": st.column_config.NumberColumn("G/P", format="%.2f"),
            "return_pct": st.column_config.NumberColumn("Rentabilidad", format="%.2f%%"),
            "Currency": "Divisa"
        },
        hide_index=True,
        use_container_width=True
    )

    # Gráficos
    c1, c2 = st.columns(2)
    with c1:
        fig = px.sunburst(df_display, path=['Currency', 'name'], values='value_base', title="Diversificación por Divisa y Activo")
        st.plotly_chart(fig, use_container_width=True)
    with c2:
        # Top Ganadores
        top_winners = df_display.sort_values("pnl_base", ascending=False).head(5)
        fig_bar = px.bar(top_winners, x="name", y="pnl_base", title="🏆 Top 5 Ganadores", text_auto='.2s', color="pnl_base")
        st.plotly_chart(fig_bar, use_container_width=True)


with tab2:
    st.header("🔮 Simulador de Escenarios")
    st.markdown("Modifica el precio simulado para ver cómo afectaría a tu PnL.")
    
    open_pos = positions[positions["is_open"]].copy()
    
    # Crear un editor de datos para simular precios
    sim_data = open_pos[["symbol", "last_price", "qty_total", "cost_net", "Currency"]].copy()
    sim_data["simulated_price"] = sim_data["last_price"]

    edited_df = st.data_editor(
        sim_data,
        column_config={
            "simulated_price": st.column_config.NumberColumn(
                "Precio Simulado",
                help="Cambia este valor para simular",
                min_value=0.0,
                step=0.1,
                format="%.2f"
            )
        },
        disabled=["symbol", "qty_total", "cost_net", "Currency"],
        hide_index=True,
    )

    # Calcular resultados simulados
    edited_df["sim_value"] = edited_df["qty_total"] * edited_df["simulated_price"]
    edited_df["sim_pnl"] = edited_df["sim_value"] - edited_df["cost_net"]
    
    def to_base(val, curr):
        if base_currency == "EUR": return val * st.session_state.fx_rate if curr == "USD" else val
        else: return val / st.session_state.fx_rate if curr == "EUR" else val

    # Totales simulados
    sim_total_value = edited_df.apply(lambda x: to_base(x["sim_value"], x["Currency"]), axis=1).sum()
    sim_total_pnl = edited_df.apply(lambda x: to_base(x["sim_pnl"], x["Currency"]), axis=1).sum()

    # Comparativa
    diff_value = sim_total_value - total_value

    st.divider()
    c1, c2, c3 = st.columns(3)
    c1.metric("Valor Simulado", f"{sim_total_value:,.2f} {base_currency}", delta=f"{diff_value:,.2f}")
    c2.metric("PnL Simulado", f"{sim_total_pnl:,.2f} {base_currency}")

    # Gráfico comparativo
    st.subheader("Comparativa PnL Real vs Simulado")

    comp_df = edited_df[["symbol", "sim_pnl"]].copy()
    comp_df["real_pnl"] = open_pos.set_index("symbol")["total_pnl"].values

    fig_comp = go.Figure()
    fig_comp.add_trace(go.Bar(x=comp_df['symbol'], y=comp_df['real_pnl'], name='Real'))
    fig_comp.add_trace(go.Bar(x=comp_df['symbol'], y=comp_df['sim_pnl'], name='Simulado'))
    st.plotly_chart(fig_comp, use_container_width=True)

with tab3:
    st.header("📜 Informe Fiscal y Dividendos")

    # Calcular dividendos y fees
    mask_others = ~mask_trades & ~df["Type"].str.contains("CASH", na=False)
    others = df[mask_others].copy()
    others["amount"] = others["Total Amount"].apply(parse_money)

    def classify(t):
        t = str(t).upper()
        if "DIVIDEND TAX" in t or "WITHHOLDING" in t: return "TAX"
        if "DIVIDEND" in t: return "DIVIDEND"
        if "FEE" in t: return "FEE"
        return "OTHER"

    others["category"] = others["Type"].apply(classify)
    cashflow = others.groupby(["Currency", "category"])["amount"].sum().unstack(fill_value=0)

    # Mostrar tabla de cashflow
    st.subheader("Flujos de Caja (Dividendos/Comisiones)")
    st.dataframe(cashflow)

    # Cálculo final neto
    st.divider()
    st.subheader("Cálculo Fiscal Estimado")

    total_divs_base = 0
    total_fees_base = 0
    total_taxes_paid_base = 0

    # Sumar cashflows convertidos
    for curr in cashflow.index:
        if "DIVIDEND" in cashflow.columns:
            total_divs_base += to_base(cashflow.loc[curr, "DIVIDEND"], curr)
        if "FEE" in cashflow.columns:
            total_fees_base += to_base(cashflow.loc[curr, "FEE"], curr)
        if "TAX" in cashflow.columns:
            total_taxes_paid_base += to_base(cashflow.loc[curr, "TAX"], curr)

    gross_profit = total_pnl + total_divs_base + total_fees_base + total_taxes_paid_base
    tax_amount = max(0, gross_profit * tax_rate)
    net_profit = gross_profit - tax_amount

    fc1, fc2, fc3 = st.columns(3)
    fc1.metric("Beneficio Bruto Total", f"{gross_profit:,.2f} {base_currency}")
    fc2.metric(f"Impuestos Estimados ({tax_rate*100:.0f}%)", f"-{tax_amount:,.2f} {base_currency}")
    fc3.metric("Beneficio Neto Final", f"{net_profit:,.2f} {base_currency}", delta_color="normal")

    st.info(f"Nota: El cálculo incluye ganancias realizadas, latentes y dividendos. Tipo de cambio aplicado: 1 USD = {st.session_state.fx_rate:.4f} EUR")

with tab4:
    st.header("🧠 Análisis AI & Métricas Avanzadas")
    
    # Check if we have history
    if st.session_state.history.empty:
        st.warning("No se pudieron cargar datos históricos para el análisis avanzado.")
    else:
        # Calcular performance del portfolio
        # Usamos solo posiciones abiertas para el cálculo de performance actual
        open_pos_analysis = positions[positions["is_open"]].copy()
        perf = calculate_portfolio_performance(open_pos_analysis, st.session_state.history)
        
        if not perf:
            st.error("No se pudo calcular el rendimiento del portfolio. Verifica los símbolos.")
        else:
            metrics = perf["metrics"]
            
            # Displays Metrics using Gauge Charts or Metrics
            st.subheader("Métricas de Riesgo (Anualizadas)")
            
            if not metrics:
                st.warning("Datos insuficientes para calcular métricas de riesgo (Sharpe, Volatilidad).")
            else:
                m1, m2, m3 = st.columns(3)
                
                sharpe = metrics.get('sharpe_ratio')
                vol = metrics.get('annual_volatility')
                dd = metrics.get('max_drawdown')

                if sharpe is not None:
                    m1.metric("Sharpe Ratio", f"{sharpe:.2f}", help="> 1 es bueno, > 2 es excelente")
                else:
                    m1.metric("Sharpe Ratio", "N/A")
                
                if vol is not None:
                    m2.metric("Volatilidad", f"{vol*100:.1f}%", help="Desviación estándar de los retornos")
                else:
                    m2.metric("Volatilidad", "N/A")
                
                if dd is not None:
                    m3.metric("Max Drawdown", f"{dd*100:.1f}%", help="Caída máxima desde el pico")
                else: 
                    m3.metric("Max Drawdown", "N/A")
            
            
            # Monte Carlo Section
            st.divider()
            st.subheader("🔮 Simulación Monte Carlo (Proyección 1 Año)")
            
            with st.spinner("Ejecutando simulación de escenarios..."):
                # Use daily returns from performance calculation
                sim_res = run_monte_carlo_simulation(perf["daily_returns"], num_simulations=500, days=252)
                stats = get_simulation_stats(sim_res)
                
                if not sim_res.empty:
                    # Plot simulation paths (subset to keep it clean)
                    # We need to scale to current portfolio value to make it real
                    current_portfolio_value = total_value
                    
                    sim_values = sim_res * current_portfolio_value
                    
                    # Add stats metrics
                    c1, c2, c3 = st.columns(3)
                    c1.metric("Escenario Pesimista (5%)", f"{stats['p05']*current_portfolio_value:,.2f} {base_currency}")
                    c2.metric("Escenario Medio (50%)", f"{stats['median']*current_portfolio_value:,.2f} {base_currency}")
                    c3.metric("Escenario Optimista (95%)", f"{stats['p95']*current_portfolio_value:,.2f} {base_currency}")
                    
                    # Chart: show some paths
                    fig_mc = go.Figure()
                    # Add median line
                    fig_mc.add_trace(go.Scatter(y=sim_values.median(axis=1), mode='lines', name='Mediana', line=dict(color='white', width=3)))
                    # Add 95% and 5%
                    fig_mc.add_trace(go.Scatter(y=sim_values.quantile(0.95, axis=1), mode='lines', name='95%', line=dict(color='green', dash='dash')))
                    fig_mc.add_trace(go.Scatter(y=sim_values.quantile(0.05, axis=1), mode='lines', name='5%', line=dict(color='red', dash='dash')))
                    
                    # Add random sample paths (faint)
                    sample_paths = sim_values.sample(n=min(50, len(sim_values.columns)), axis=1)
                    for col in sample_paths.columns:
                        fig_mc.add_trace(go.Scatter(y=sample_paths[col], mode='lines', showlegend=False, line=dict(color='gray', width=0.5, opacity=0.3)))
                        
                    fig_mc.update_layout(title="Proyección de Valor de Cartera", xaxis_title="Días Trading", yaxis_title=f"Valor ({base_currency})")
                    st.plotly_chart(fig_mc, use_container_width=True)

