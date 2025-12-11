import numpy as np
import pandas as pd

def run_monte_carlo_simulation(daily_returns, num_simulations=1000, days=252):
    """
    Runs Monte Carlo simulation for portfolio projections.
    Returns a DataFrame with simulation paths.
    
    :param daily_returns: Series of historical daily portfolio returns
    :param num_simulations: Number of paths to simulate
    :param days: Number of days to project (default 252 = 1 year)
    """
    if daily_returns.empty:
        return pd.DataFrame()
    
    # Calculate drift and volatility from history
    # log returns approach typically used for MC
    # returns = ln(1 + r)
    log_returns = np.log(1 + daily_returns)
    
    u = log_returns.mean()
    var = log_returns.var()
    stdev = log_returns.std()
    
    # Drift = u - 0.5 * var
    drift = u - (0.5 * var)
    
    # Random component: Z * stdev
    # We generate a matrix of random Z scores
    daily_vol = stdev
    
    # Simulations
    # Path starting at 1.0 (normalized)
    
    Z = np.random.normal(0, 1, (days, num_simulations))
    daily_returns_sim = np.exp(drift + daily_vol * Z)
    
    # Cumulative returns
    price_paths = np.zeros_like(daily_returns_sim)
    price_paths[0] = 1.0 # Start
    
    # Accumulate products
    # But wait, exp(drift + ...) gives the price ratio for that day relative to previous day
    # So we can use cumprod
    
    price_paths = np.vstack([np.ones((1, num_simulations)), daily_returns_sim]).cumprod(axis=0)
    
    # Limit to days requested (array is days+1 long now)
    price_paths = price_paths[1:]
    
    return pd.DataFrame(price_paths)

def get_simulation_stats(simulation_df):
    """
    Returns percentiles for the simulation.
    """
    if simulation_df.empty:
        return {}
    
    items = simulation_df.iloc[-1] # End of period values
    
    return {
        "mean": items.mean(),
        "median": items.median(),
        "p95": np.percentile(items, 95),
        "p05": np.percentile(items, 5),
        "worst": items.min(),
        "best": items.max()
    }
