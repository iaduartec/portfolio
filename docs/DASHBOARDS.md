# AI Portfolio System - Dashboard Specifications

## 1. MAIN COMMAND CENTER (Operational View)

**Purpose**: Immediate situational awareness for the Portfolio Manager.

- **Top Bar**:
  - System Status: `ONLINE` (Green)
  - Active Phase: `PHASE 3: PREDICTION`
  - Net Liquidation Value (NLV)
  - Daily P&L / YTD P&L
- **Central Panel: High-Conviction Signals**:
  - List of active "BUY/SELL" signals that passed Validation.
  - Columns: Asset, Action, Confidence %, Exp Return, Auditor Status (✅).
- **Right Panel: System Alerts**:
  - Real-time feed from Phase 5 (Alerts).
  - Red pulses for "Extreme Drawdown Risk" or "Insider Buying".

## 2. THE AUDIT ROOM ("The Truth Machine")

**Purpose**: Transparency into the Claude 3.5 Sonnet Auditor's decisions.

- **Split View**:
  - **Left (Operational AI Proposals)**: Stream of raw signals from Gemini.
  - **Right (Auditor Decisions)**:
    - green text: "APPROVED"
    - red text: "REJECTED - Reason: Overfitting detection"
- **Metrics**:
  - Rejection Rate (e.g., "Auditor blocked 43% of signals today").
  - "Saves": Examples where Auditor rejected a trade that would have lost money (simulated).

## 3. ASSET DEEP DIVE (360° View)

**Purpose**: Single-screen analysis for a specific ticker (e.g., TSLA).

- **quadrant 1: Price & Technicals**
  - Interactive Chart with Multi-timeframe overlays.
  - Support/Resistance zones automatically drawn.
- **Quadrant 2: Fundamentals & Insiders**
  - Scorecard (0-100).
  - Bar chart of recent Insider Buys/Sells.
- **Quadrant 3: AI Prediction & Scenarios**
  - Fan Chart (Confidence Intervals) for next 7-30 days.
  - Text summary of "Primary Scenario" vs "Alternative".
- **Quadrant 4: Sentiment & Macro**
  - News sentiment gauge.
  - Correlation to current Macro regime (e.g., "Highly correlated to 10Y Yield").

## 4. PORTFOLIO RISK HAELTH

**Purpose**: Risk management and attribution.

- **Risk Metrics Gauge**:
  - Sharpe Ratio (Rolling 30d).
  - Current Beta.
  - Value at Risk (VaR 95%).
- **Exposure Heatmap**:
  - By Sector, Asset Class, and Factor (Momentum, Value, Volatility).
- **Benchmark Comparison**:
  - Equity Curve vs SPY/QQQ.
  - Drawdown Underwater Chart.
