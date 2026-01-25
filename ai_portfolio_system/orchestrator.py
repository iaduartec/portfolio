from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class AgentConfig:
    role: str
    model: str
    execution_mode: str
    responsibilities: List[str]


class AIOrchestrator:
    def __init__(self) -> None:
        self.core = AgentConfig(
            role="Portfolio_Core_AI",
            model="Gemini 3 Pro (High)",
            execution_mode="Autonomous chain-of-thought",
            responsibilities=[
                "Risk Engine",
                "Portfolio Strategy",
                "Asset Allocation",
            ],
        )
        self.data_eng = AgentConfig(
            role="Data_Engineering_AI",
            model="Gemini 3 Pro (Low)",
            execution_mode="Batch + Streaming",
            responsibilities=[
                "Data Ingestion",
                "Pipeline Reliability",
                "Data Quality",
            ],
        )
        self.audit = AgentConfig(
            role="Audit_Logic_AI",
            model="Claude Sonnet 4.5 (Thinking)",
            execution_mode="Delayed validation",
            responsibilities=[
                "Detect Contradictions",
                "Audit Trails",
                "Compliance Checks",
            ],
        )
        self.macro = AgentConfig(
            role="Macro_Strategy_AI",
            model="Claude Opus 4.5 (Thinking)",
            execution_mode="On demand",
            responsibilities=[
                "Macro Cycles",
                "Rate Regimes",
                "Global Signals",
            ],
        )
        self.ops = AgentConfig(
            role="Ops_Automation_AI",
            model="GPT-OSS 120B (Medium)",
            execution_mode="Reactive",
            responsibilities=[
                "API Integrations",
                "Monitoring",
                "Automation",
            ],
        )
