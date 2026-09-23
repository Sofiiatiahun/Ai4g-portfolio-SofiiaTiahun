import os

# Automatically load .env file if it exists (pure Python, zero dependencies)
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'\"")
                if k not in os.environ:
                    os.environ[k] = v

# Default API key (loaded from GEMINI_API_KEY in .env or environment)
DEFAULT_API_KEY = ""

# Active API key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", DEFAULT_API_KEY)

# Gemini models supported by the API.
# Defaults to gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash
# Can be overridden with GEMINI_MODEL env var or CLI argument
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
]

API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
SERVER_PORT = int(os.environ.get("PORT", 8080))
SERVER_HOST = os.environ.get("HOST", "0.0.0.0")
