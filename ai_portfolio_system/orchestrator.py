from .core_agent.agent import PortfolioCoreAI
from .data_agent.agent import DataEngineeringAI
from .audit_agent.agent import AuditLogicAI
from .macro_agent.agent import MacroStrategyAI
from .ops_agent.agent import OpsAutomationAI

class AIOrchestrator:
    def __init__(self):
        self.core = PortfolioCoreAI()
        self.data_eng = DataEngineeringAI()
        self.audit = AuditLogicAI()
        self.macro = MacroStrategyAI()
        self.ops = OpsAutomationAI()
        
        self.agents = [
            self.core,
            self.data_eng,
            self.audit,
            self.macro,
            self.ops
        ]

    def report_system_status(self):
        """
        Prints the status and configuration of all agents.
        """
        print("=== AI Portfolio System Status ===")
        for agent in self.agents:
            print(f"Agent: {agent.role}")
            print(f"  Model: {agent.model}")
            print(f"  Mode: {agent.execution_mode}")
            print(f"  Access: {agent.access_level}")
            print("  Responsibilities:")
            for resp in agent.responsibilities:
                print(f"    - {resp}")
            print("-" * 30)

if __name__ == "__main__":
    orchestrator = AIOrchestrator()
    orchestrator.report_system_status()
