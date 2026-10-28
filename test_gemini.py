
import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(Path(__file__).resolve().parent / ".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("ERROR: API key not found in .env")
    raise SystemExit(1)

try:
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=120000)
    )

    print("Sending a test request to Gemini...", flush=True)

    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents="Reply with exactly: PaisaPilot AI is connected!"
    )

    print("\nSUCCESS! Gemini replied:", flush=True)
    print(response.text, flush=True)

except Exception as e:
    print("\nREQUEST FAILED:", type(e).__name__, str(e), flush=True)
