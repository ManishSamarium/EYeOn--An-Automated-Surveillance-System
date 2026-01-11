import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { surveillanceAPI } from "../services/api";
import { getSocket } from "../services/websocket";

export default function SurveillancePage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const statusPollingRef = useRef(null);

  const checkStatus = async () => {
    try {
      const response = await surveillanceAPI.getStatus();
      setIsRunning(response.data.isActive);
    } catch (err) {
      console.error("Error checking status:", err);
    }
  };

  const startStatusPolling = () => {
    // Poll status every 2 seconds
    statusPollingRef.current = setInterval(() => {
      checkStatus();
    }, 2000);
  };

  const stopStatusPolling = () => {
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
      statusPollingRef.current = null;
    }
  };

  useEffect(() => {
    checkStatus();
    // Camera is used by surveillance service only, not by browser
    // startWebcam(); 
    startStatusPolling();

    const socket = getSocket();
    socket.on("surveillance:started", () => {
      setIsRunning(true);
      addMessage("Surveillance started", "info");
    });
    socket.on("surveillance:stopped", () => {
      setIsRunning(false);
      addMessage("Surveillance stopped", "info");
    });
    socket.on("unknown:detected", (data) => {
      addMessage(`Unknown person detected: ${data.timestamp}`, "warning");
    });
    socket.on("face_detected", (data) => {
      addMessage(`${data.name} detected (${data.face_type})`, "success");
    });

    return () => {
      socket.off("surveillance:started");
      socket.off("surveillance:stopped");
      socket.off("unknown:detected");
      socket.off("face_detected");
      // stopWebcam();
      stopStatusPolling();
    };
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      addMessage("Failed to access webcam", "error");
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
  };

  const addMessage = (msg, type) => {
    setMessages((prev) =>
      [
        {
          id: Date.now(),
          text: msg,
          type,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 20)
    );
  };

  const handleStart = async () => {
    setLoading(true);
    setError("");
    try {
      await surveillanceAPI.start();
      setIsRunning(true);
      addMessage("Surveillance started", "success");
      // Check status again to sync with backend
      setTimeout(checkStatus, 500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start surveillance");
      addMessage("Failed to start surveillance", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setError("");
    try {
      await surveillanceAPI.stop();
      setIsRunning(false);
      addMessage("Surveillance stopped", "success");
      // Check status again to sync with backend
      setTimeout(checkStatus, 500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to stop surveillance");
      addMessage("Failed to stop surveillance", "error");
    } finally {
      setLoading(false);
    }
  };

  const getMessageColor = (type) => {
    switch (type) {
      case "success":
        return "bg-green-100 border-green-400 text-green-700";
      case "warning":
        return "bg-yellow-100 border-yellow-400 text-yellow-700";
      case "info":
        return "bg-blue-100 border-blue-400 text-blue-700";
      case "error":
        return "bg-red-100 border-red-400 text-red-700";
      default:
        return "bg-gray-100 border-gray-400 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-4 gap-4">
          {/* Left Column - Status Info */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Camera Status
              </h2>
              <div className="w-full rounded-lg bg-gray-900 aspect-video flex items-center justify-center text-white">
                <div className="text-center p-4">
                  <div className="text-4xl mb-2">
                    {isRunning ? "📹" : "📷"}
                  </div>
                  <p className="text-sm font-semibold">
                    {isRunning ? "Active" : "Standby"}
                  </p>
                  <p className="text-xs mt-2 opacity-75">
                    Camera in use by<br/>surveillance service
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {isRunning ? "🟢 Recording" : "⚪ Standby"}
              </p>
            </div>
          </div>

          {/* Right Column - Controls and Logs */}
          <div className="col-span-3 space-y-4">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">
                Surveillance Control
              </h1>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <div
                className={`rounded-lg p-6 mb-6 ${
                  isRunning
                    ? "bg-green-100 border-2 border-green-400"
                    : "bg-gray-100 border-2 border-gray-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-700 font-bold">Current Status</p>
                    <p
                      className={`text-2xl font-bold ${
                        isRunning ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      {isRunning ? "🔴 ACTIVE" : "⚫ INACTIVE"}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={handleStart}
                      disabled={isRunning || loading}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50"
                    >
                      {loading && !isRunning ? "Starting..." : "Start"}
                    </button>
                    <button
                      onClick={handleStop}
                      disabled={!isRunning || loading}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50"
                    >
                      {loading && isRunning ? "Stopping..." : "Stop"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Detection Log */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Detection Log
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No detections yet. Start surveillance to begin.
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`border-l-4 px-4 py-2 rounded text-sm ${getMessageColor(
                        msg.type
                      )}`}
                    >
                      <div className="flex justify-between">
                        <span className="font-semibold">{msg.text}</span>
                        <span className="text-xs opacity-75">{msg.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Back Button */}
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
