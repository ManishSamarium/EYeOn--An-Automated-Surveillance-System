import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
let socket = null;

/**
 * Connect and authenticate socket
 */
export const connectSocket = (token) => {
  if (socket && socket.connected) {
    return socket;
  }
  
  socket = io(SOCKET_URL, {
    auth: {
      token: token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });
  
  // Send authentication after connection
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    if (token) {
      socket.emit('authenticate', token);
    }
  });
  
  socket.on('authenticated', (data) => {
    console.log('Socket authenticated:', data);
  });
  
  socket.on('auth_error', (data) => {
    console.error('Socket auth error:', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  return socket;
};

export const getSocket = () => socket || connectSocket(localStorage.getItem('token'));

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/* ============ SURVEILLANCE EVENTS ============ */

export const onSurveillanceStarted = (cb) => {
  getSocket().on('surveillance:started', cb);
};

export const onSurveillanceStopped = (cb) => {
  getSocket().on('surveillance:stopped', cb);
};

export const emitSurveillanceStart = () => {
  getSocket().emit('surveillance:start');
};

export const emitSurveillanceStop = () => {
  getSocket().emit('surveillance:stop');
};

/* ============ DETECTION EVENTS (USER-SCOPED) ============ */

/**
 * Listen for unknown person detection (user-scoped)
 */
export const onUnknownDetected = (cb) => {
  getSocket().on('unknown:detected', cb);
};

/**
 * Listen for classification of unknown (user-scoped)
 */
export const onUnknownClassified = (cb) => {
  getSocket().on('unknown:classified', cb);
};

/**
 * Listen for deletion of unknown (user-scoped)
 */
export const onUnknownDeleted = (cb) => {
  getSocket().on('unknown:deleted', cb);
};

/* ============ FAMILY EVENTS (USER-SCOPED) ============ */

export const onFamilyUpdated = (cb) => {
  getSocket().on('family:updated', cb);
};

/* ============ CATEGORY EVENTS (USER-SCOPED) ============ */

export const onCategoryUpdated = (cb) => {
  getSocket().on('category:updated', cb);
};

/* ============ NOTIFICATION EVENTS (USER-SCOPED) ============ */

/**
 * Generic notification listener (for backward compatibility)
 */
export const listenUserNotifications = (userId, cb) => {
  getSocket().on('unknown:detected', cb);
  getSocket().on('notification', cb);
};

/**
 * Generic notification listener
 */
export const onNotification = (cb) => {
  getSocket().on('notification', cb);
};

/**
 * Listen for classified notification
 */
export const onNotificationClassified = (cb) => {
  getSocket().on('notification:classified', cb);
};

/**
 * Listen for deleted notification
 */
export const onNotificationDeleted = (cb) => {
  getSocket().on('notification:deleted', cb);
};

export default {
  connectSocket,
  getSocket,
  disconnectSocket,
  onSurveillanceStarted,
  onSurveillanceStopped,
  onUnknownDetected,
  onUnknownClassified,
  onUnknownDeleted,
  onFamilyUpdated,
  onCategoryUpdated,
  onNotification,
  onNotificationClassified,
  onNotificationDeleted
};
