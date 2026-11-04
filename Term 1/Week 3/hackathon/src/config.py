from pathlib import Path
import os

# load local .env if present
env_file = next((p for p in (Path(__file__).parent / ".env", Path(__file__).parent.parent / ".env") if p.is_file()), None)
if env_file:
    for line in env_file.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.strip().split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip("'\""))

# ensure standard system certificates on macos / linux if not already configured
if "SSL_CERT_FILE" not in os.environ and os.path.exists("/etc/ssl/cert.pem"):
    os.environ["SSL_CERT_FILE"] = "/etc/ssl/cert.pem"

# gemini api credentials
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# default llm model: gemini-3.5-flash-lite
# fast sub-second to low-latency multimodal generation, reliable formatting
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")

# google generative ai rest api endpoint
API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

# local web server binding
SERVER_PORT = int(os.environ.get("PORT", 8080))
SERVER_HOST = os.environ.get("HOST", "0.0.0.0")
