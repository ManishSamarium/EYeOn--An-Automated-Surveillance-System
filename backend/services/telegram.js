import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Send text message via Telegram
 */
export const sendTelegramMessage = async (chatId, message) => {
  try {
    const response = await axios.post(`${API_URL}/sendMessage`, {
      chat_id: chatId || TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    return response.data;
  } catch (error) {
    console.error('Telegram message error:', error.message);
    throw error;
  }
};

/**
 * Send photo with caption via Telegram
 */
export const sendTelegramPhoto = async (chatId, photoUrl, caption) => {
  try {
    const response = await axios.post(`${API_URL}/sendPhoto`, {
      chat_id: chatId || TELEGRAM_CHAT_ID,
      photo: photoUrl,
      caption: caption || '',
      parse_mode: 'HTML'
    });
    return response.data;
  } catch (error) {
    console.error('Telegram photo error:', error.message);
    throw error;
  }
};

/**
 * Send alert for family member arrival (should be silent)
 */
export const sendFamilyArrivalAlert = async (familyName, chatId) => {
  const message = `✅ <b>${familyName}</b> detected`;
  return sendTelegramMessage(chatId, message);
};

/**
 * Send alert for category person arrival (e.g., milkman)
 */
export const sendCategoryAlert = async (categoryName, chatId) => {
  const message = `🔔 <b>${categoryName}</b> arrived`;
  return sendTelegramMessage(chatId, message);
};

/**
 * Send alert for unknown person detection with photo
 */
export const sendUnknownDetectionAlert = async (photoUrl, chatId) => {
  const caption = '⚠️ <b>Unknown person detected!</b>';
  return sendTelegramPhoto(chatId, photoUrl, caption);
};

export default {
  sendTelegramMessage,
  sendTelegramPhoto,
  sendFamilyArrivalAlert,
  sendCategoryAlert,
  sendUnknownDetectionAlert
};
