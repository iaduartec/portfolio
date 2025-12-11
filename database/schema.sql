-- ==========================================
-- FASE 1: INGESTION OUTPUTS
-- ==========================================

-- clean_portfolio.db
CREATE TABLE IF NOT EXISTS portfolio_transactions (
    id TEXT PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    asset_id TEXT NOT NULL,
    type TEXT NOT NULL, -- BUY, SELL, DIVIDEND, SPLIT
    quantity DECIMAL NOT NULL,
    price_per_share DECIMAL NOT NULL,
    currency TEXT NOT NULL,
    fee DECIMAL DEFAULT 0,
    total_amount DECIMAL NOT NULL,
    source_file TEXT,
    normalized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_positions (
    asset_id TEXT PRIMARY KEY,
    quantity DECIMAL NOT NULL,
    cost_basis DECIMAL NOT NULL,
    current_market_value DECIMAL,
    last_updated TIMESTAMP
);

-- market_timeseries.db
CREATE TABLE IF NOT EXISTS market_ohlcv (
    asset_id TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    timeframe TEXT NOT NULL, -- '1m', '1h', '1d'
    open DECIMAL NOT NULL,
    high DECIMAL NOT NULL,
    low DECIMAL NOT NULL,
    close DECIMAL NOT NULL,
    volume DECIMAL NOT NULL,
    adjusted_close DECIMAL,
    PRIMARY KEY (asset_id, date, timeframe)
);

-- fundamentals.db
CREATE TABLE IF NOT EXISTS asset_fundamentals (
    asset_id TEXT NOT NULL,
    report_date DATE NOT NULL,
    metric_name TEXT NOT NULL, -- 'PE_RATIO', 'EPS', 'REVENUE', 'DEBT_TO_EQUITY'
    metric_value DECIMAL NOT NULL,
    period TEXT, -- 'Q1', 'FY2024'
    PRIMARY KEY (asset_id, report_date, metric_name)
);

-- insiders.db
CREATE TABLE IF NOT EXISTS insider_trades (
    transaction_id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    filing_date DATE NOT NULL,
    insider_name TEXT NOT NULL,
    role TEXT, -- 'CEO', 'DIRECTOR'
    transaction_type TEXT NOT NULL, -- 'BUY', 'SELL', 'GRANT'
    shares_traded DECIMAL NOT NULL,
    price_per_share DECIMAL NOT NULL,
    value_traded DECIMAL NOT NULL,
    owned_after DECIMAL
);

-- macro.db
CREATE TABLE IF NOT EXISTS macro_indicators (
    indicator_id TEXT NOT NULL, -- 'US_GDP', 'CPI', 'FED_RATE'
    date DATE NOT NULL,
    value DECIMAL NOT NULL,
    unit TEXT,
    release_date TIMESTAMP,
    PRIMARY KEY (indicator_id, date)
);

-- ==========================================
-- FASE 2: ANALYSIS OUTPUTS
-- ==========================================

CREATE TABLE IF NOT EXISTS analysis_metrics (
    asset_id TEXT NOT NULL,
    date DATE NOT NULL,
    metric_type TEXT NOT NULL, -- 'SHARPE', 'BETA', 'RSI_14'
    value DECIMAL NOT NULL,
    metadata JSONB, -- For extra details like 'benchmark_used'
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (asset_id, date, metric_type)
);

-- ==========================================
-- FASE 3: PREDICTION OUTPUTS
-- ==========================================

CREATE TABLE IF NOT EXISTS predictions (
    prediction_id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    model_name TEXT NOT NULL, -- 'LSTM_V1', 'MONTE_CARLO'
    forecast_date DATE NOT NULL, -- When the prediction is for
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    primary_scenario_price DECIMAL,
    optimistic_scenario_price DECIMAL,
    pessimistic_scenario_price DECIMAL,
    confidence_score DECIMAL CHECK (confidence_score BETWEEN 0 AND 1),
    probability_up DECIMAL CHECK (probability_up BETWEEN 0 AND 1)
);

-- ==========================================
-- FASE 4: VALIDATION (AUDITOR)
-- ==========================================

CREATE TABLE IF NOT EXISTS validation_audit_log (
    audit_id TEXT PRIMARY KEY,
    prediction_id TEXT NOT NULL,
    auditor_model TEXT NOT NULL, -- 'Claude-Sonnet-4.5-Thinking'
    status TEXT NOT NULL, -- 'APPROVED', 'REJECTED'
    rejection_reason TEXT,
    bias_check_score DECIMAL,
    overfit_check_score DECIMAL,
    notes TEXT,
    audited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prediction_id) REFERENCES predictions(prediction_id)
);

-- ==========================================
-- FASE 5: ALERTS
-- ==========================================

CREATE TABLE IF NOT EXISTS system_alerts (
    alert_id TEXT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category TEXT NOT NULL, -- 'BREAKOUT', 'INSIDER', 'RISK'
    severity TEXT NOT NULL, -- 'INFO', 'WARNING', 'CRITICAL'
    message TEXT NOT NULL,
    asset_id TEXT,
    related_prediction_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (related_prediction_id) REFERENCES predictions(prediction_id)
);
