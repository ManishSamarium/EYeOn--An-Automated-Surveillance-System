import requests
import os
from typing import Optional
import asyncio

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

async def send_unknown_alert(photo_url: str, chat_id: Optional[str] = None):
    """
    Send unknown person detection alert with photo.
    """
    try:
        chat_id = chat_id or TELEGRAM_CHAT_ID
        
        response = requests.post(
            f"{API_URL}/sendPhoto",
            data={
                "chat_id": chat_id,
                "caption": "⚠️ <b>Unknown person detected!</b>",
                "parse_mode": "HTML"
            },
            files={"photo": requests.get(photo_url).content}
        )
        
        if response.status_code == 200:
            print(f"Unknown alert sent to {chat_id}")
            return response.json()
        else:
            print(f"Failed to send unknown alert: {response.text}")
            return None
    
    except Exception as e:
        print(f"Error sending unknown alert: {e}")
        raise

async def send_category_alert(category_name: str, chat_id: Optional[str] = None):
    """
    Send category (visitor) arrival alert.
    """
    try:
        chat_id = chat_id or TELEGRAM_CHAT_ID
        
        message = f"🔔 <b>{category_name}</b> arrived"
        
        response = requests.post(
            f"{API_URL}/sendMessage",
            data={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML"
            }
        )
        
        if response.status_code == 200:
            print(f"Category alert sent to {chat_id}")
            return response.json()
        else:
            print(f"Failed to send category alert: {response.text}")
            return None
    
    except Exception as e:
        print(f"Error sending category alert: {e}")
        raise

async def send_text_alert(text: str, chat_id: Optional[str] = None):
    """
    Send generic text alert.
    """
    try:
        chat_id = chat_id or TELEGRAM_CHAT_ID
        
        response = requests.post(
            f"{API_URL}/sendMessage",
            data={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML"
            }
        )
        
        if response.status_code == 200:
            print(f"Text alert sent to {chat_id}")
            return response.json()
        else:
            print(f"Failed to send text alert: {response.text}")
            return None
    
    except Exception as e:
        print(f"Error sending text alert: {e}")
        raise

def send_alert(image_path):
    """Legacy function for compatibility."""
    try:
        with open(image_path, 'rb') as img:
            requests.post(
                f"{API_URL}/sendPhoto",
                data={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "caption": "⚠️ Unknown person detected"
                },
                files={"photo": img}
            )
    except Exception as e:
        print(f"Error in legacy send_alert: {e}")

