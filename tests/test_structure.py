import unittest
import sys
import os

# Add the project root to the path so we can import the new package
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ai_portfolio_system.orchestrator import AIOrchestrator

class TestStructure(unittest.TestCase):
    def setUp(self):
        self.orchestrator = AIOrchestrator()

    def test_core_agent_config(self):
        agent = self.orchestrator.core
        self.assertEqual(agent.role, "Portfolio_Core_AI")
        self.assertEqual(agent.model, "Gemini 3 Pro (High)")
        self.assertEqual(agent.execution_mode, "Autonomous chain-of-thought")
        self.assertIn("Risk Engine", agent.responsibilities)

    def test_data_agent_config(self):
        agent = self.orchestrator.data_eng
        self.assertEqual(agent.role, "Data_Engineering_AI")
        self.assertEqual(agent.model, "Gemini 3 Pro (Low)")
        self.assertEqual(agent.execution_mode, "Batch + Streaming")
        self.assertIn("Data Ingestion", agent.responsibilities)

    def test_audit_agent_config(self):
        agent = self.orchestrator.audit
        self.assertEqual(agent.role, "Audit_Logic_AI")
        self.assertEqual(agent.model, "Claude Sonnet 4.5 (Thinking)")
        self.assertEqual(agent.execution_mode, "Delayed validation")
        self.assertIn("Detect Contradictions", agent.responsibilities)

    def test_macro_agent_config(self):
        agent = self.orchestrator.macro
        self.assertEqual(agent.role, "Macro_Strategy_AI")
        self.assertEqual(agent.model, "Claude Opus 4.5 (Thinking)")
        self.assertEqual(agent.execution_mode, "On demand")
        self.assertIn("Macro Cycles", agent.responsibilities)

    def test_ops_agent_config(self):
        agent = self.orchestrator.ops
        self.assertEqual(agent.role, "Ops_Automation_AI")
        self.assertEqual(agent.model, "GPT-OSS 120B (Medium)")
        self.assertEqual(agent.execution_mode, "Reactive")
        self.assertIn("API Integrations", agent.responsibilities)

if __name__ == '__main__':
    unittest.main()
