import pytest
import sys
import json


import gltest.direct.loader as _gl_loader
import gltest.direct.pytest_plugin as _gl_plugin

_orig_deploy = _gl_loader.deploy_contract
_orig_load_module = _gl_loader._load_module

def _patch_genlayer_gl():
    if "genlayer.gl" in sys.modules:
        gl_mod = sys.modules["genlayer.gl"]
        import genlayer.gl.vm as _vm
        setattr(gl_mod, "UserError", _vm.UserError)
    if "genlayer" in sys.modules:
        gl_pkg = sys.modules["genlayer"]
        if hasattr(gl_pkg, "gl"):
            import genlayer.gl.vm as _vm
            setattr(gl_pkg.gl, "UserError", _vm.UserError)

def _patched_load_module(contract_path):
    mod = _orig_load_module(contract_path)
    _patch_genlayer_gl()
    if hasattr(mod, "gl"):
        import genlayer.gl.vm as _vm
        setattr(mod.gl, "UserError", _vm.UserError)
    return mod

def _patched_deploy(*args, **kwargs):
    instance = _orig_deploy(*args, **kwargs)
    _patch_genlayer_gl()
    if hasattr(instance, "__class__"):
        mod = sys.modules.get(instance.__class__.__module__)
        if mod and hasattr(mod, "gl"):
            import genlayer.gl.vm as _vm
            setattr(mod.gl, "UserError", _vm.UserError)
    return instance

_gl_loader._load_module = _patched_load_module
_gl_loader.deploy_contract = _patched_deploy
_gl_plugin.deploy_contract = _patched_deploy


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


@pytest.fixture(autouse=True)
def sync_direct_vm_warp(direct_vm):
    """
    Ensure direct_vm.warp also synchronizes gl.message_raw['datetime']
    so contracts prioritizing authoritative gl.message_raw['datetime']
    receive the exact warped timestamp.
    """
    orig_warp = direct_vm.warp

    def _wrapped_warp(timestamp: str) -> None:
        orig_warp(timestamp)
        import sys
        for mod_name in ("genlayer.gl", "genlayer"):
            if mod_name in sys.modules:
                mod = sys.modules[mod_name]
                if hasattr(mod, "message_raw") and isinstance(mod.message_raw, dict):
                    mod.message_raw["datetime"] = timestamp
                if hasattr(mod, "gl") and hasattr(mod.gl, "message_raw") and isinstance(mod.gl.message_raw, dict):
                    mod.gl.message_raw["datetime"] = timestamp
        # Also patch any loaded contract modules
        for name, m in list(sys.modules.items()):
            if name.startswith("_contract_"):
                if hasattr(m, "gl") and hasattr(m.gl, "message_raw") and isinstance(m.gl.message_raw, dict):
                    m.gl.message_raw["datetime"] = timestamp

    direct_vm.warp = _wrapped_warp


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
