import numpy as np
import pandas as pd

def calculate_position_metrics(positions, prices, metadata):
    """
    Enriches positions dataframe with market value, pnl, etc.
    """
    # Enriquecer Dataframe
    positions["name"] = positions["symbol"].map(lambda x: metadata.get(x, {}).get("name", x))
    positions["logo"] = positions["symbol"].map(lambda x: metadata.get(x, {}).get("logo", ""))
    positions["last_price"] = positions["symbol"].map(prices)
    
    # Cálculos financieros
    positions["market_value"] = np.where(positions["is_open"], positions["qty_total"] * positions["last_price"], 0.0)
    positions["total_pnl"] = positions["market_value"] - positions["cost_net"]
    positions["return_pct"] = np.where(positions["cost_net"]!=0, positions["total_pnl"]/positions["cost_net"], 0.0)
    
    return positions

def convert_currency(df, fx_rate, base_currency="EUR"):
    """
    Converts PnL and Value to base currency.
    """
    def convert(val, curr):
        if base_currency == "EUR": return val * fx_rate if curr == "USD" else val
        else: return val / fx_rate if curr == "EUR" else val

    df["pnl_base"] = df.apply(lambda x: convert(x["total_pnl"], x["Currency"]), axis=1)
    df["value_base"] = df.apply(lambda x: convert(x["market_value"], x["Currency"]), axis=1)
    return df

def calculate_portfolio_performance(positions, historical_prices, benchmark_ticker="^GSPC"):
    """
    Calculates portfolio-wide metrics based on weights and historical returns.
    """
    if positions.empty or historical_prices.empty:
        return {}
    
    # 1. Calculate Weights
    # We need to map positions dataframe Symbols to historical_prices Columns
    # Assuming 'symbol' in positions matches or we need a cleaner mapping.
    # For now, let's assume we can match loosely or we need the resolved ticker in positions.
    # In loader we resolved them but didn't save the resolved ticker in the simple load_data.
    # We might need to handle this mapping better.
    
    # To keep it simple: We'll skip symbols not found in history
    
    # Calculate current market value per position
    # (Assuming calculate_position_metrics was run)
    total_value = positions["market_value"].sum()
    if total_value == 0:
        return {}
        
    weights = {}
    for _, row in positions.iterrows():
        # Heuristic to find the column in historical_prices
        # logic in loader: try suffixes.
        # We need the resolved ticker. 
        # Ideally, positions should have 'resolved_ticker'.
        # For this iteration, we'll try to match.
        sym = row["symbol"]
        qty = row["qty_total"]
        val = row["market_value"]
        
        # Determine likely column
        col_match = None
        for col in historical_prices.columns:
            if col == sym or col.startswith(sym + "."):
                col_match = col
                break
        
        if col_match:
            weights[col_match] = val / total_value
            
    if not weights:
        return {}
        
    # 2. Calculate Portfolio Returns
    # Daily returns of assets
    returns = historical_prices.pct_change(fill_method=None).dropna()
    
    # Portfolio daily return = sum(weight_i * return_i)
    # Filter returns to only weighted assets
    relevant_tickers = list(weights.keys())
    relevant_returns = returns[relevant_tickers]
    
    # weight vector
    w_vector = pd.Series(weights)
    
    # Portfolio daily returns
    portfolio_daily_ret = relevant_returns.dot(w_vector)
    
    # 3. Metrics
    metrics = calculate_advanced_metrics(portfolio_daily_ret)
    
    # Add cumulative return for plotting
    cumulative_ret = (1 + portfolio_daily_ret).cumprod()
    
    return {
        "metrics": metrics,
        "daily_returns": portfolio_daily_ret,
        "cumulative_returns": cumulative_ret
    }

def calculate_advanced_metrics(returns_series, risk_free_rate=0.03):
    """
    Calculates Sharpe Ratio, Volatility, Max Drawdown.
    """
    if returns_series.empty:
        return {}
    
    # Annualized count (approx 252 trading days)
    N = 252
    
    # Volatility (Annualized Std Dev)
    volatility = returns_series.std() * np.sqrt(N)
    
    # Sharpe Ratio (Annualized)
    # Mean daily return * 252
    mean_return = returns_series.mean() * N
    sharpe = (mean_return - risk_free_rate) / volatility if volatility != 0 else 0
    
    # Max Drawdown
    cumulative = (1 + returns_series).cumprod()
    peak = cumulative.cummax()
    drawdown = (cumulative - peak) / peak
    max_drawdown = drawdown.min()
    
    return {
        "annual_volatility": volatility,
        "sharpe_ratio": sharpe,
        "max_drawdown": max_drawdown,
        "annual_return": mean_return
    }
