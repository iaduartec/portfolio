import pandas as pd
import yfinance as yf
from datetime import datetime
import glob
import os

def load_portfolio_data() -> pd.DataFrame:
    """Loads the most recent portfolio CSV file found in the directory."""
    files = glob.glob("Mi cartera_*.csv")
    if not files:
        # Fallback to revolut*.csv if needed, as seen in other scripts
        files = glob.glob("revolut*.csv")
        
    if not files:
        raise FileNotFoundError("No portfolio CSV files found (Mi cartera_*.csv or revolut*.csv)")
        
    files.sort(reverse=True)
    filename = files[0]
    print(f"📂 Loading data from: {filename}")
    return pd.read_csv(filename)

def parse_money(x):
    """Parses currency strings to floats."""
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
    """Maps custom tickers to Yahoo Finance format."""
    if pd.isna(raw_symbol):
        return None
    
    # Custom mappings based on common European tickers seen in the project
    mapping = {
        'ENL': 'ENEL.MI',
        '41L': 'ROVI.MC',
        'AJ3': 'ANA.MC',
        'OZTA': 'GRF.MC',
        'VHM': 'SCYR.MC'
    }
    
    # If direct match
    if raw_symbol in mapping:
        return mapping[raw_symbol]
        
    parts = raw_symbol.split(':')
    if len(parts) == 2:
        exchange, ticker = parts
        if exchange == 'MIL': return f"{ticker}.MI"
        if exchange == 'BME': return f"{ticker}.MC"
        if exchange == 'NASDAQ': return ticker
        if exchange == 'NYSE': return ticker
        return ticker
    return raw_symbol

def get_current_prices(tickers: list) -> dict:
    """Get current prices from Yahoo Finance."""
    print(f"🌍 Fetching prices for: {', '.join(tickers)}")
    prices = {}
    if not tickers:
        return prices
        
    try:
        # Download in bulk
        data = yf.download(tickers, period="1d", progress=False)['Close']
        if len(tickers) == 1:
            prices[tickers[0]] = float(data.iloc[-1])
        else:
            for t in tickers:
                try:
                    prices[t] = float(data[t].iloc[-1])
                except:
                    pass
    except Exception as e:
        print(f"⚠️ Error fetching prices: {e}")
    return prices

def calculate_portfolio_performance(df: pd.DataFrame):
    """Calculates PnL and current value."""
    # Preprocess
    df['yf_ticker'] = df['Symbol'].apply(resolve_ticker)
    df['Qty'] = df['Qty'].apply(parse_money)
    df['Fill Price'] = df['Fill Price'].apply(parse_money)
    df['Commission'] = df['Commission'].apply(parse_money)
    
    positions = {} # ticker -> {qty, cost_basis}
    realized_pnl = 0.0
    
    for _, row in df.iterrows():
        side = str(row['Side']).lower()
        ticker = row['yf_ticker']
        qty = row['Qty']
        price = row['Fill Price']
        comm = row['Commission']
        
        if not ticker or ticker == '$CASH' or side == 'dividend':
            continue
            
        if ticker not in positions:
            positions[ticker] = {'qty': 0.0, 'cost': 0.0}
            
        if side == 'buy':
            positions[ticker]['qty'] += qty
            positions[ticker]['cost'] += (qty * price) + comm
        elif side == 'sell':
            # Simplified Avg Cost logic
            curr_qty = positions[ticker]['qty']
            curr_cost = positions[ticker]['cost']
            
            if curr_qty > 0:
                avg_cost = curr_cost / curr_qty
            else:
                avg_cost = 0
                
            cost_portion = avg_cost * qty
            proceeds = (qty * price) - comm
            
            pnl = proceeds - cost_portion
            realized_pnl += pnl
            
            positions[ticker]['qty'] -= qty
            positions[ticker]['cost'] -= cost_portion

    # Analyze Open Positions
    open_positions = {t: data for t, data in positions.items() if abs(data['qty']) > 0.0001}
    
    if not open_positions:
        print("No open positions.")
        print(f"Realized PnL: ${realized_pnl:.2f}")
        return

    # Get Prices
    tickers = list(open_positions.keys())
    prices = get_current_prices(tickers)
    
    total_market_value = 0.0
    total_unrealized_pnl = 0.0
    
    print("\n📊 Portfolio Status:")
    print(f"{'Ticker':<10} {'Qty':<10} {'Cost Basis':<12} {'Mkt Value':<12} {'Unrealized':<12}")
    print("-" * 60)
    
    for t, data in open_positions.items():
        qty = data['qty']
        cost = data['cost']
        price = prices.get(t, 0.0)
        mkt_val = qty * price
        unrealized = mkt_val - cost
        
        total_market_value += mkt_val
        total_unrealized_pnl += unrealized
        
        print(f"{t:<10} {qty:<10.4f} {cost:<12.2f} {mkt_val:<12.2f} {unrealized:<12.2f}")
        
    print("-" * 60)
    print(f"💎 Total Market Value:   {total_market_value:10.2f}")
    print(f"📈 Total Unrealized PnL: {total_unrealized_pnl:10.2f}")
    print(f"💰 Total Realized PnL:   {realized_pnl:10.2f}")

def main():
    try:
        df = load_portfolio_data()
        calculate_portfolio_performance(df)
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    main()