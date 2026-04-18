import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { notificationAPI } from "../services/api";
import { getSocket } from "../services/websocket";
import { generatePlaceholderImage } from "../utils/imageGenerator";

// Rebuild Cloudinary URL if backend only returns public_id
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const buildCloudinaryUrl = (publicId) =>
  publicId && cloudName
    ? `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`
    : null;

export default function NotificationPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadNotifications();

    // Listen for real-time notifications
    const socket = getSocket();
    if (socket) {
      socket.on("unknown:detected", () => {
        loadNotifications();
      });

      socket.on("unknown:classified", () => {
        loadNotifications();
      });

      socket.on("unknown:deleted", (id) => {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      });
    }

    return () => {
      if (socket) {
        socket.off("unknown:detected");
        socket.off("unknown:classified");
        socket.off("unknown:deleted");
      }
    };
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.listNotifications();
      console.log("Notifications loaded:", response.data);
      setNotifications(response.data);
      setError("");
    } catch (err) {
      console.error("Error loading notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkProcessed = async (id) => {
    try {
      await notificationAPI.processNotification(id);
      loadNotifications();
    } catch (err) {
      console.error("Error marking as processed:", err);
      setError("Failed to process notification");
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationAPI.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error("Error deleting notification:", err);
      setError("Failed to delete notification");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Are you sure you want to delete all ${notifications.length} notifications?`)) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all(notifications.map((n) => notificationAPI.deleteNotification(n._id)));
      setNotifications([]);
      setError("");
    } catch (err) {
      console.error("Error deleting all notifications:", err);
      setError("Failed to delete all notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAll = async () => {
    try {
      setLoading(true);
      await Promise.all(notifications.map((n) => notificationAPI.processNotification(n._id)));
      loadNotifications();
    } catch (err) {
      console.error("Error processing all notifications:", err);
      setError("Failed to process all notifications");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Notifications</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded transition"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Detection Notifications</h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-xl">No notifications yet</p>
              <p className="text-gray-400 text-sm mt-2">Unknown detections will appear here</p>
            </div>
          ) : (
            <>
              <div className="flex gap-3 mb-6">
                <button
                  onClick={handleProcessAll}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition"
                >
                  Process All
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
                >
                  Delete All
                </button>
              </div>
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className="border border-gray-300 rounded-lg p-4 flex justify-between items-start hover:shadow-md transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {(() => {
                          const imageSrc = notification.imageUrl || buildCloudinaryUrl(notification.cloudinaryPublicId);
                          const fallback = generatePlaceholderImage(`Notif ${notification._id.slice(-4)}`);
                          return (
                            <img
                              src={imageSrc || fallback}
                              alt="Detection"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.warn("Notification image failed to load:", imageSrc);
                                e.target.onerror = null;
                                e.target.src = fallback;
                              }}
                            />
                          );
                        })()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          Unknown Person Detected
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                        {notification.category && (
                          <p className="text-sm text-gray-500">
                            Category: {notification.category}
                          </p>
                        )}
                        {notification.isProcessed && (
                          <span className="inline-block mt-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            Processed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    {!notification.isProcessed && (
                      <button
                        onClick={() => handleMarkProcessed(notification._id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition"
                      >
                        Mark Processed
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification._id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
