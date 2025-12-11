import pandas as pd
import glob
import yfinance as yf
import streamlit as st

# ==========================
# DATA LOADING & PARSING
# ==========================

@st.cache_data
def load_data():
    """
    Loads trade data from CSV files.
    Supports 'Revolut' format and 'Mi cartera' format.
    """
    # 1. Try loading Revolut files first
    files_revolut = glob.glob("revolut*.csv")
    if files_revolut:
        dfs = []
        for f in files_revolut:
            dfs.append(pd.read_csv(f))
        if dfs:
            return pd.concat(dfs, ignore_index=True)

    # 2. Try loading 'Mi cartera' files
    files_micartera = glob.glob("Mi cartera_*.csv")
    if files_micartera:
        dfs = []
        for f in files_micartera:
            df = pd.read_csv(f)
            # Normalize 'Mi cartera' to expected schema
            
            # Map Symbol -> Ticker & Currency
            def parse_symbol(s):
                if pd.isna(s) or ":" not in s: 
                    return s, "USD" # Default logic / Fallback
                exchange, ticker = s.split(":")
                currency = "EUR" if exchange in ["MIL", "BME"] else "USD"
                
                # Adjust Ticker for yfinance if needed
                if exchange == "MIL": ticker = f"{ticker}.MI"
                elif exchange == "BME": ticker = f"{ticker}.MC"
                
                return ticker, currency

            # Apply transformations
            df["Ticker"], df["Currency"] = zip(*df["Symbol"].apply(parse_symbol))
            df["Type"] = df["Side"].str.upper().apply(lambda x: "BUY" if "BUY" in x or "DEPOSIT" in x else "SELL") # Rough mapping
            
            # Fix Type for Dividends
            df.loc[df["Side"].str.contains("Dividend", case=False, na=False), "Type"] = "DIVIDEND"
            
            df["Quantity"] = df["Qty"]
            # Total Amount: implied as Price * Qty for now. 
            df["Total Amount"] = df["Qty"] * df["Fill Price"]
            
            dfs.append(df)
            
        if dfs:
            return pd.concat(dfs, ignore_index=True)

    return None

def parse_money(x):
    """Parses money string to float."""
    if pd.isna(x): return None
    if isinstance(x, str):
        parts = x.split()
        if len(parts) == 2: num = parts[1].replace(",", "")
        else: num = x.replace(",", "")
        try: return float(num)
        except ValueError: return None
    return x

def get_ticker_mapping():
    return {
        "ENL": "ENEL.MI",   # Enel (Milan)
        "41L": "ROVI.MC",   # Rovi (Madrid)
        "AJ3": "ANA.MC",    # Acciona (Madrid)
        "OZTA": "GRF.MC",   # Grifols (Madrid)
        "VHM": "SCYR.MC",   # Sacyr (Madrid)
    }

# ==========================
# EXTERNAL DATA (YFINANCE)
# ==========================

@st.cache_data(ttl=3600*24) # Cache 24h for metadata
def get_ticker_metadata(symbols):
    mapping = get_ticker_mapping()
    metadata = {}

    progress_bar = st.progress(0)
    status_text = st.empty()
    total = len(symbols)

    for i, sym in enumerate(symbols):
        if "CASH" in sym or sym.startswith("$"):
             progress_bar.progress((i + 1) / total)
             continue
             
        status_text.text(f"🎨 Obteniendo datos de {sym}...")

        # Resolver símbolo real
        search_sym = mapping.get(sym, sym)

        # Intentar sufijos si no tiene
        if "." not in search_sym:
            # Estrategia rápida: probar sin sufijo primero (US), luego .DE
            candidates = [search_sym, search_sym + ".DE", search_sym + ".MC"]
        else:
            candidates = [search_sym]

        name = sym
        logo = None

        for cand in candidates:
            try:
                ticker = yf.Ticker(cand)
                info = ticker.info

                # Intentar obtener nombre
                if 'longName' in info:
                    name = info['longName']
                elif 'shortName' in info:
                    name = info['shortName']

                # Intentar obtener logo via website -> clearbit
                if 'website' in info and info['website']:
                    domain = info['website'].replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "")
                    logo = f"https://logo.clearbit.com/{domain}"

                if name != sym: # Si encontramos un nombre real, paramos
                    break
            except:
                continue

        # Fallback de logo si no se encuentra (logo genérico de bolsa)
        if not logo:
            logo = "https://cdn-icons-png.flaticon.com/512/3310/3310624.png"

        metadata[sym] = {"name": name, "logo": logo}
        progress_bar.progress((i + 1) / total)

    status_text.empty()
    progress_bar.empty()
    return metadata

@st.cache_data(ttl=300) # Cache 5 min for prices
def get_current_prices(symbols):
    mapping = get_ticker_mapping()
    prices = {}

    for sym in symbols:
        if "CASH" in sym or sym.startswith("$"):
             continue
             
        search_sym = mapping.get(sym, sym)

        # Lógica simplificada de sufijos para precios
        suffixes = ["", ".DE", ".MC", ".MI", ".PA", ".L"]
        if "." in search_sym: suffixes = [""] + suffixes

        for suffix in suffixes:
            try:
                test_symbol = search_sym + suffix if "." not in search_sym else search_sym
                ticker = yf.Ticker(test_symbol)
                hist = ticker.history(period="2d") # 2 dias por si es fin de semana
                if not hist.empty:
                    prices[sym] = hist['Close'].iloc[-1]
                    break
            except:
                continue

        if sym not in prices:
            prices[sym] = 0.0

    return prices

@st.cache_data(ttl=3600*12) # Cache 12h
def get_historical_prices(symbols, period="1y"):
    """
    Fetches historical closing prices for a list of symbols.
    Returns a DataFrame with dates as index and symbols as columns.
    """
    mapping = get_ticker_mapping()
    valid_tickers = []
    
    # Resolve symbols first
    resolved_map = {}
    for sym in symbols:
        if "CASH" in sym or sym.startswith("$"):
            continue
            
        search_sym = mapping.get(sym, sym)
        # Simple resolution logic (same as get_current_prices mostly)
        suffixes = ["", ".DE", ".MC", ".MI", ".PA", ".L"]
        if "." in search_sym: suffixes = [""] + suffixes
        
        found = False
        for suffix in suffixes:
            test_symbol = search_sym + suffix if "." not in search_sym else search_sym
            try:
                # Quick verification if needed, or just add to list and let yfinance handle
                # But yfinance download is better with list
                # For now let's resolve one by one or trust the resolution
                 resolved_map[sym] = test_symbol
                 found = True
                 break
            except:
                continue
        if not found:
             resolved_map[sym] = search_sym

    # Download in batch
    unique_tickers = list(set(resolved_map.values()))
    if not unique_tickers:
        return pd.DataFrame()

    try:
        data = yf.download(unique_tickers, period=period, progress=False)['Close']
        # Rename columns back to original symbols if possible, but ambiguous if multiple map to same
        # Let's keep resolved tickers in DF, and map metrics using resolved tickers
        return data
    except Exception as e:
        print(f"Error fetching historical data: {e}")
        return pd.DataFrame()

def get_usd_eur_rate():
    try:
        return yf.Ticker("EUR=X").history(period="1d")['Close'].iloc[-1]
    except:
        return 0.95
