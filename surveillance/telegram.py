"""Legacy Telegram alert helper. Active engine uses helpers defined in ``main.py``."""

from __future__ import annotations

import os
from typing import Optional

import requests

TOKEN: Optional[str] = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID: Optional[str] = os.getenv("TELEGRAM_CHAT_ID")


def send_alert(image_path: str, caption: str = "⚠ Unknown person detected") -> None:
    if not TOKEN or not CHAT_ID:
        return
    try:
        with open(image_path, "rb") as fh:
            requests.post(
                f"https://api.telegram.org/bot{TOKEN}/sendPhoto",
                data={"chat_id": CHAT_ID, "caption": caption},
                files={"photo": fh},
                timeout=10,
            )
    except Exception:
        pass
