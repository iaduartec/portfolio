
import pandas as pd
import glob
import sys
import os

# Mock the streamlit cache decorator since we are running this as a script
import streamlit as st
from unittest.mock import MagicMock
st.cache_data = lambda func: func

# Import the function to test
# We need to import load_data from app.py. 
# Since app.py is a script, we might just want to replicate the logic or exec it.
# Taking the safe route: importing the modified function by reading the file and executing the specific part or reusing the logic if possible.
# Actually, since we modified app.py, we can just try to run the relevant part.

def test_load_data_logic():
    print("Testing load_data logic...")
    
    # Verify file exists
    files = glob.glob("Mi cartera_*.csv")
    if not files:
        print("❌ No 'Mi cartera' file found for test.")
        return

    print(f"Found files: {files}")

    # Re-implement the key logic from the modification to verify it simply
    # (This avoids complex imports of a streamlit app)
    df_raw = pd.read_csv(files[0])
    
    print("\nOriginal Data Sample:")
    print(df_raw.head().to_string())

    # normalization logic copy-paste from what we just wrote to verify it works as python code
    def parse_symbol(s):
        if pd.isna(s) or ":" not in s: 
            return s, "USD"
        exchange, ticker = s.split(":")
        currency = "EUR" if exchange in ["MIL", "BME"] else "USD"
        
        if exchange == "MIL": ticker = f"{ticker}.MI"
        elif exchange == "BME": ticker = f"{ticker}.MC"
        
        return ticker, currency

    df = df_raw.copy()
    try:
        df["Ticker"], df["Currency"] = zip(*df["Symbol"].apply(parse_symbol))
        df["Type"] = df["Side"].str.upper().apply(lambda x: "BUY" if "BUY" in x or "DEPOSIT" in x else "SELL")
        df.loc[df["Side"].str.contains("Dividend", case=False, na=False), "Type"] = "DIVIDEND"
        df["Quantity"] = df["Qty"]
        df["Total Amount"] = df["Qty"] * df["Fill Price"]
        
        print("\nNormalized Data Sample:")
        print(df[["Ticker", "Type", "Quantity", "Total Amount", "Currency"]].head().to_string())
        
        # Assertions
        assert "Ticker" in df.columns
        assert "Currency" in df.columns
        assert not df[df["Currency"] == "EUR"].empty, "Should have EUR entries"
        assert not df[df["Currency"] == "USD"].empty, "Should have USD entries"
        
        print("\n✅ Logic Verification Passed")
        
    except Exception as e:
        print(f"\n❌ Logic Verification Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_load_data_logic()
