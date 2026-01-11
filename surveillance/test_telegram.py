import os, requests
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
print("Loading:", env_path)
load_dotenv(env_path, override=True)

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
print ("Environment variables:")

print("TOKEN =", TOKEN)
print("CHAT_ID =", CHAT_ID)

res = requests.post(
    f"https://api.telegram.org/bot{TOKEN}/sendMessage",
    data={"chat_id": CHAT_ID, "text": "EYeOn Telegram CONNECTED!"}
)

print(res.text)
