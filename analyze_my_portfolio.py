import pandas as pd
import yfinance as yf
import glob
import os

def parse_money(x):
    if pd.isna(x):
        return 0.0
    if isinstance(x, (int, float)):
        return float(x)
    if isinstance(x, str):
        # Remove currency symbols or clean up
        clean = x.replace(',', '')
        try:
            return float(clean)
        except:
            return 0.0
    return 0.0

def resolve_ticker(raw_symbol):
    """
    Maps 'MIL:ENEL' -> 'ENEL.MI', 'BME:GRF' -> 'GRF.MC', etc.
    """
    if pd.isna(raw_symbol):
        return None
    
    parts = raw_symbol.split(':')
    if len(parts) == 2:
        exchange, ticker = parts
        if exchange == 'MIL':
            return f"{ticker}.MI"
        if exchange == 'BME':
            return f"{ticker}.MC"
        if exchange == 'NASDAQ':
            return ticker # Often yfinance handles AAPL directly
        if exchange == 'NYSE':
            return ticker
        return ticker # Fallback
    
    # Handle direct tickers or other formats
    return raw_symbol

def analyze_portfolio():
    # 1. Find the CSV
    files = glob.glob("Mi cartera_*.csv")
    if not files:
        print("❌ No 'Mi cartera_*.csv' file found.")
        return

    # Pick the most recent one if multiple
    files.sort(reverse=True)
    filename = files[0]
    print(f"📂 Loading: {filename}")

    df = pd.read_csv(filename)
    
    # 2. Preprocess
    # Expected cols: Symbol, Side, Qty, Fill Price, Commission, Closing Time
    
    # Filter out pure cash/dividends for position calculation if needed, 
    # but Dividends are useful for Total Return. 
    # Let's focus on Open Positions first.
    
    # Tickers
    df['yf_ticker'] = df['Symbol'].apply(resolve_ticker)
    
    # Numerics
    df['Qty'] = df['Qty'].apply(parse_money)
    df['Fill Price'] = df['Fill Price'].apply(parse_money)
    df['Commission'] = df['Commission'].apply(parse_money)
    
    # Sort by Date Ascending
    if 'Closing Time' in df.columns:
        df['Closing Time'] = pd.to_datetime(df['Closing Time'])
        df = df.sort_values('Closing Time', ascending=True)
    
    # 3. Calculate Positions
    # We need to net out Buys and Sells.
    # Assumes 'Side' is 'Buy' or 'Sell'
    
    positions = {} # ticker -> {qty: 0, cost_basis: 0}
    
    # Adjust for Dividend rows? They have Side='Dividend' usually.
    # We will track Realized PnL and Cash separately if we want a full account,
    # but user asked to "analyze my portfolio" which usually means specific holdings.
    
    realized_pnl = 0.0
    dividends_total = 0.0
    
    for idx, row in df.iterrows():
        side = str(row['Side']).lower()
        ticker = row['yf_ticker']
        qty = row['Qty']
        price = row['Fill Price']
        comm = row['Commission']
        
        if ticker == '$CASH':
            continue

        if side == 'dividend':
            dividends_total += qty # In the CSV, Qty seems to be the Amount for dividends?
            # Let's check the CSV sample:
            # 27: MIL:ENEL,Dividend,11.6,,,2025-07-24...
            # The 'Qty' column holds the value 11.6. 'Fill Price' is empty.
            continue
            
        if not ticker: 
            continue

        if ticker not in positions:
            positions[ticker] = {'qty': 0.0, 'cost': 0.0}
            
        if side == 'buy':
            positions[ticker]['qty'] += qty
            positions[ticker]['cost'] += (qty * price) + comm
        
        elif side == 'sell':
            # FIFO or Weighted Average? 
            # For simple "current view", we reduce qty.
            # Realized PnL = (Sell Price * Qty) - (Avg Cost * Qty) - Comm
            
            # Avg cost
            current_qty = positions[ticker]['qty']
            current_cost = positions[ticker]['cost']
            
            if current_qty > 0:
                avg_cost = current_cost / current_qty
            else:
                avg_cost = 0 # Short selling or data issue
                
            cost_of_sold = avg_cost * qty
            proceeds = (qty * price) - comm
            
            pnl = proceeds - cost_of_sold
            realized_pnl += pnl
            
            positions[ticker]['qty'] -= qty
            positions[ticker]['cost'] -= cost_of_sold
            
    # 4. Filter Open Positions
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
        print(f"💰 Realized PnL: {realized_pnl:.2f}")
        print(f"💵 Dividends: {dividends_total:.2f}")
        return

    # 5. Get Current Prices
    tickers_list = res_df['Ticker'].unique().tolist()
    print(f"🌍 Fetching prices for: {', '.join(tickers_list)}")
    
    prices = {}
    if tickers_list:
        try:
            # download in bulk
            data = yf.download(tickers_list, period="1d", progress=False)['Close']
            # data structure depends on number of tickers
            if len(tickers_list) == 1:
                # series, name is the ticker
                prices[tickers_list[0]] = data.iloc[-1]
            else:
                for t in tickers_list:
                    # if multi-index, might need check
                    try:
                        prices[t] = data[t].iloc[-1]
                    except:
                        pass
        except Exception as e:
            print(f"⚠️ Error fetching prices: {e}")

    # Fallback/Fill prices
    def get_price(t):
        if t in prices:
            return float(prices[t])
        return 0.0

    res_df['CurrentPrice'] = res_df['Ticker'].apply(get_price)
    res_df['MarketValue'] = res_df['Qty'] * res_df['CurrentPrice']
    res_df['UnrealizedPnL'] = res_df['MarketValue'] - res_df['CostBasis']
    res_df['Return%'] = (res_df['UnrealizedPnL'] / res_df['CostBasis']) * 100
    
    # 6. Report
    print("\n" + "="*50)
    print(f"📊 PORTFOLIO SUMMARY: {filename}")
    print("="*50)
    
    total_market_value = res_df['MarketValue'].sum()
    total_cost = res_df['CostBasis'].sum()
    total_unrealized = res_df['UnrealizedPnL'].sum()
    
    print(res_df[['Ticker', 'Qty', 'AvgPrice', 'CurrentPrice', 'MarketValue', 'UnrealizedPnL', 'Return%']].to_string(index=False, float_format="%.2f"))
    
    print("-" * 50)
    print(f"💎 Total Market Value:   {total_market_value:10.2f}")
    print(f"📦 Total Cost Basis:     {total_cost:10.2f}")
    print(f"📈 Total Unrealized PnL: {total_unrealized:10.2f}")
    print(f"💰 Total Realized PnL:   {realized_pnl:10.2f}")
    print(f"💵 Total Dividends:      {dividends_total:10.2f}")
    print("="*50)

if __name__ == "__main__":
    analyze_portfolio()
