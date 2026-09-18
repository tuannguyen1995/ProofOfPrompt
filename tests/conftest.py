import pytest
import sys
import json


def clear_known_contracts():
    """Reset genlayer internal known contract registry between test cases."""
    for name, module in list(sys.modules.items()):
        if "genlayer" in name and hasattr(module, "__known_contract__"):
            setattr(module, "__known_contract__", None)


@pytest.fixture(autouse=True)
def reset_contracts():
    clear_known_contracts()
    yield
    clear_known_contracts()


@pytest.fixture
def mock_infringement_llm_and_web():
    """Returns bare-dict mock parameters for confirmed infringement."""
    return {
        "llm_mocks": {
            ".*": json.dumps({
                "verdict": "INFRINGEMENT_CONFIRMED",
                "confidence": 95,
                "similarity_score": 92,
                "reason": "Clear forensic match: Exact canary style tokens and syntactic prompting structures detected."
            })
        },
        "web_mocks": {
            ".*": {
                "status": 200,
                "body": "Commercial Launch: CyberArt Studio. Style: Cyberpunk Neon Noir with canary token [POP-CANARY-7789] and exact volumetric lighting schema."
            }
        }
    }


@pytest.fixture
def mock_clean_llm_and_web():
    """Returns bare-dict mock parameters for clean non-infringing work."""
    return {
        "llm_mocks": {
            ".*": json.dumps({
                "verdict": "CLEAN_AUTHORIZED",
                "confidence": 90,
                "similarity_score": 15,
                "reason": "Independent creation: Standard atmospheric prompt without proprietary canary tokens or protected DNA markers."
            })
        },
        "web_mocks": {
            ".*": {
                "status": 200,
                "body": "Organic Nature Photography: High resolution landscape image with natural sunlight and wilderness palette."
            }
        }
    }
