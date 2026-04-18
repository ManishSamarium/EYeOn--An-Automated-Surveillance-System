import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

if (
  !import.meta.env.VITE_SOCKET_URL &&
  typeof window !== 'undefined' &&
  !/^(localhost|127\.|\[::1\])/.test(window.location.hostname)
) {
  // eslint-disable-next-line no-console
  console.error(
    '[EYeOn] VITE_SOCKET_URL is not set; websocket falls back to localhost. ' +
      'Set VITE_SOCKET_URL on Vercel and rebuild.'
  );
}
let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?._id) {
      socket.on('connect', () => socket.emit('subscribe', user._id));
    }
  }
  return socket;
};

export const getSocket = () => socket || connectSocket();

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const onSurveillanceStarted = (cb) => getSocket().on('surveillance:started', cb);
export const onSurveillanceStopped = (cb) => getSocket().on('surveillance:stopped', cb);
export const onUnknownDetected = (cb) => getSocket().on('unknown:detected', cb);
export const onFamilyUpdated = (cb) => getSocket().on('family:updated', cb);
export const onCategoryUpdated = (cb) => getSocket().on('category:updated', cb);

export const listenUserNotifications = (userId, cb) => {
  const s = getSocket();
  s.on(`notify:${userId}`, cb);
  return () => s.off(`notify:${userId}`, cb);
};

export const emitSurveillanceStart = () => getSocket().emit('surveillance:start');
export const emitSurveillanceStop = () => getSocket().emit('surveillance:stop');
