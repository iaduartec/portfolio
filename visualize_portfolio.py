import pandas as pd
import yfinance as yf
import glob
import os
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import webbrowser

def parse_money(x):
    if pd.isna(x):
        return 0.0
    if isinstance(x, (int, float)):
        return float(x)
    if isinstance(x, str):
        clean = x.replace(',', '')
        try:
            return float(clean)
        except:
            return 0.0
    return 0.0

def resolve_ticker(raw_symbol):
    if pd.isna(raw_symbol):
        return None
    parts = raw_symbol.split(':')
    if len(parts) == 2:
        exchange, ticker = parts
        if exchange == 'MIL': return f"{ticker}.MI"
        if exchange == 'BME': return f"{ticker}.MC"
        if exchange == 'NASDAQ': return ticker
        if exchange == 'NYSE': return ticker
        return ticker
    return raw_symbol

def analyze_and_visualize():
    # 1. Load Data
    files = glob.glob("Mi cartera_*.csv")
    if not files:
        print("❌ No 'Mi cartera_*.csv' file found.")
        return

    files.sort(reverse=True)
    filename = files[0]
    print(f"📂 Loading: {filename}")
    df = pd.read_csv(filename)

    # 2. Process Data
    df['yf_ticker'] = df['Symbol'].apply(resolve_ticker)
    df['Qty'] = df['Qty'].apply(parse_money)
    df['Fill Price'] = df['Fill Price'].apply(parse_money)
    df['Commission'] = df['Commission'].apply(parse_money)

    positions = {}
    
    for idx, row in df.iterrows():
        side = str(row['Side']).lower()
        ticker = row['yf_ticker']
        qty = row['Qty']
        price = row['Fill Price']
        comm = row['Commission']
        
        if ticker == '$CASH' or side == 'dividend' or not ticker:
            continue

        if ticker not in positions:
            positions[ticker] = {'qty': 0.0, 'cost': 0.0}
            
        if side == 'buy':
            positions[ticker]['qty'] += qty
            positions[ticker]['cost'] += (qty * price) + comm
        elif side == 'sell':
            current_qty = positions[ticker]['qty']
            current_cost = positions[ticker]['cost']
            avg_cost = current_cost / current_qty if current_qty > 0 else 0
            cost_of_sold = avg_cost * qty
            positions[ticker]['qty'] -= qty
            positions[ticker]['cost'] -= cost_of_sold

    # 3. Create DataFrame for Analysis
    open_positions = []
    for t, data in positions.items():
        if abs(data['qty']) > 0.0001:
            open_positions.append({
                'Ticker': t,
                'Qty': data['qty'],
                'CostBasis': data['cost'],
                'AvgPrice': data['cost'] / data['qty'] if data['qty'] != 0 else 0
            })
            
    res_df = pd.DataFrame(open_positions)
    
    if res_df.empty:
        print("⚠️ No open positions found.")
        return

    # 4. Fetch Market Data
    tickers_list = res_df['Ticker'].unique().tolist()
    print(f"🌍 Fetching prices for: {', '.join(tickers_list)}")
    
    prices = {}
    if tickers_list:
        try:
            data = yf.download(tickers_list, period="1d", progress=False)['Close']
            if len(tickers_list) == 1:
                prices[tickers_list[0]] = float(data.iloc[-1])
            else:
                for t in tickers_list:
                    try:
                        prices[t] = float(data[t].iloc[-1])
                    except:
                        pass
        except Exception as e:
            print(f"⚠️ Error fetching prices: {e}")

    res_df['CurrentPrice'] = res_df['Ticker'].apply(lambda t: prices.get(t, 0.0))
    res_df['MarketValue'] = res_df['Qty'] * res_df['CurrentPrice']
    res_df['UnrealizedPnL'] = res_df['MarketValue'] - res_df['CostBasis']
    res_df['Return%'] = (res_df['UnrealizedPnL'] / res_df['CostBasis']) * 100

    # 5. Generate Visualizations
    print("🎨 Generating graphs...")
    
    # Pie Chart: Allocation
    fig1 = px.pie(res_df, values='MarketValue', names='Ticker', title='Portfolio Allocation (Market Value)',
                  hole=0.4)
    fig1.update_traces(textinfo='percent+label')

    # Bar Chart: PnL
    colors = ['green' if x >= 0 else 'red' for x in res_df['UnrealizedPnL']]
    fig2 = go.Figure(data=[
        go.Bar(name='Unrealized PnL', x=res_df['Ticker'], y=res_df['UnrealizedPnL'], marker_color=colors)
    ])
    fig2.update_layout(title_text='Unrealized PnL by Ticker', yaxis_title='Profit/Loss ($)')

    # Table
    fig3 = go.Figure(data=[go.Table(
        header=dict(values=['Ticker', 'Qty', 'Avg Price', 'Current Price', 'Market Value', 'Unrealized PnL', 'Return %'],
                    fill_color='paleturquoise',
                    align='left'),
        cells=dict(values=[res_df.Ticker, res_df.Qty.round(4), res_df.AvgPrice.round(2), 
                           res_df.CurrentPrice.round(2), res_df.MarketValue.round(2), 
                           res_df.UnrealizedPnL.round(2), res_df['Return%'].round(2)],
                   fill_color='lavender',
                   align='left'))
    ])
    fig3.update_layout(title_text="Portfolio Details")

    # Save to HTML
    output_file = "portfolio_report.html"
    with open(output_file, 'w') as f:
        f.write("<html><head><title>Portfolio Report</title></head><body>")
        f.write("<h1>Portfolio Analysis Report</h1>")
        f.write(fig1.to_html(full_html=False, include_plotlyjs='cdn'))
        f.write(fig2.to_html(full_html=False, include_plotlyjs='cdn'))
        f.write(fig3.to_html(full_html=False, include_plotlyjs='cdn'))
        f.write("</body></html>")
    
    print(f"✅ Report generated: {output_file}")
    
    # Open in Browser
    abs_path = os.path.abspath(output_file)
    webbrowser.open(f"file://{abs_path}")

if __name__ == "__main__":
    analyze_and_visualize()
