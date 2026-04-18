import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { notificationAPI } from "../services/api";
import { getSocket } from "../services/websocket";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();

    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user?._id) return undefined;

    const socket = getSocket();
    const handler = () => load();
    socket.on(`notify:${user._id}`, handler);
    return () => socket.off(`notify:${user._id}`, handler);
  }, []);

  const load = async () => {
    try {
      const res = await notificationAPI.list();
      setItems(res.data);
      setError("");
    } catch {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      load();
    } catch {
      /* ignore */
    }
  };

  const remove = async (id) => {
    try {
      await notificationAPI.remove(id);
      setItems((prev) => prev.filter((n) => n._id !== id));
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">Loading...</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
          <button
            onClick={markAllRead}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            Mark all read
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No notifications yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => (
              <li
                key={n._id}
                className={`border rounded-lg p-4 flex gap-4 ${
                  n.read ? "bg-white" : "bg-blue-50"
                }`}
              >
                {n.imageUrl && (
                  <img
                    src={n.imageUrl}
                    alt=""
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{n.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => remove(n._id)}
                  className="text-red-500 text-sm"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => navigate("/dashboard")}
          className="w-full mt-8 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
