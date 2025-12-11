import yaml
import logging
import sys
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Orchestrator")

def load_config(config_path="config/pipeline_config.yaml"):
    try:
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    except Exception as e:
        logger.error(f"Failed to load config: {e}")
        sys.exit(1)

def run_pipeline():
    logger.info("Initializing AI Portfolio System (Autonomous Hedge Fund)...")
    config = load_config()
    
    phases = config.get('architecture', {}).get('phases', [])
    logger.info(f"Loaded pipeline with {len(phases)} phases.")

    # Phase 1: Ingestion
    logger.info(">>> STARTING PHASE 1: INGESTION (Gemini 3 Pro Low)")
    # Call src.ingestion.handler (placeholder)
    logger.info("Databases updated: clean_portfolio.db, market_timeseries.db")

    # Phase 2: Analysis
    logger.info(">>> STARTING PHASE 2: ANALYSIS (Gemini 3 Pro High)")
    # Call src.analysis.engine (placeholder)
    logger.info("Metrics calculated: P&L, Sharpe, Volatility Regimes")

    # Phase 3: Prediction
    logger.info(">>> STARTING PHASE 3: PREDICTION (Gemini 3 Pro High)")
    # Call src.prediction.model_runner (placeholder)
    logger.info("Generated 50+ probabilistic forecasts.")
    
    # Phase 4: Validation
    logger.info(">>> STARTING PHASE 4: VALIDATION (Claude 3.5 Sonnet Thinking)")
    from src.validation.auditor import AuditorAgent
    auditor = AuditorAgent()
    
    # Mock prediction for demo
    mock_prediction = {"id": "PRED-001", "asset": "NVDA", "forecast": "UP", "confidence": 0.98}
    market_context = {"vix": 25.0, "regime": "High Volatility"}
    
    result = auditor.validate_prediction(mock_prediction, market_context)
    if result.approved:
        logger.info(f"Prediction {mock_prediction['id']} APPROVED.")
    else:
        logger.warning(f"Prediction {mock_prediction['id']} BLOCKED by Auditor. Reason: {result.reason}")

    # Phase 5: Alerts
    logger.info(">>> STARTING PHASE 5: ALERTS")
    logger.info("Monitoring for breakouts and insider activity...")

    logger.info("Pipeline cycle complete.")

if __name__ == "__main__":
    run_pipeline()
