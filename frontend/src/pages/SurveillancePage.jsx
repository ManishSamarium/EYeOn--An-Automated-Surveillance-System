import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  surveillanceAPI,
  familyAPI,
  categoryAPI,
  unknownAPI
} from "../services/api";
import {
  loadModels,
  descriptorFromImageUrl,
  detectInVideo,
  buildMatcher,
  captureVideoFrame
} from "../services/faceApi";

const DETECT_INTERVAL_MS = 1500;
const UNKNOWN_COOLDOWN_MS = 20000;
const KNOWN_COOLDOWN_MS = 60000;

export default function SurveillancePage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const matcherRef = useRef(null);
  const loopRef = useRef(null);
  const lastUnknownRef = useRef(0);
  const lastKnownRef = useRef(new Map());

  const [status, setStatus] = useState("loading");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [matcherSize, setMatcherSize] = useState(0);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setStatus("loading");
        await loadModels();
        if (!mounted) return;
        setModelsLoaded(true);
        await startWebcam();
        setStatus("ready");
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError(err.message || "Failed to load face recognition models");
        setStatus("error");
      }
    })();

    return () => {
      mounted = false;
      if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
      }
      stopWebcam();
    };
  }, []);

  const addMessage = (text, type = "info") => {
    setMessages((prev) =>
      [
        {
          id: Date.now() + Math.random(),
          text,
          type,
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ].slice(0, 30)
    );
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          /* autoplay policy — user will click something */
        }
      }
    } catch (err) {
      console.error("getUserMedia failed", err);
      addMessage("Failed to access webcam. Grant camera permission.", "error");
      throw err;
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const buildKnownMatcher = async () => {
    addMessage("Loading known faces...", "info");
    const [famRes, catRes] = await Promise.all([
      familyAPI.listMembers(),
      categoryAPI.listCategories()
    ]);

    const labeled = [];
    for (const fam of famRes.data) {
      try {
        const desc = await descriptorFromImageUrl(fam.imageUrl);
        if (desc) labeled.push({ label: `family:${fam.name}`, descriptor: desc });
        else addMessage(`No face in photo for ${fam.name}`, "warning");
      } catch {
        addMessage(`Could not load photo for ${fam.name}`, "warning");
      }
    }
    for (const cat of catRes.data) {
      try {
        const desc = await descriptorFromImageUrl(cat.imageUrl);
        if (desc) labeled.push({ label: `category:${cat.name}`, descriptor: desc });
        else addMessage(`No face in photo for category ${cat.name}`, "warning");
      } catch {
        addMessage(`Could not load photo for category ${cat.name}`, "warning");
      }
    }

    matcherRef.current = buildMatcher(labeled, 0.5);
    setMatcherSize(labeled.length);
    if (!labeled.length) {
      addMessage(
        "No known faces — everyone will be flagged as Unknown",
        "warning"
      );
    } else {
      addMessage(`Indexed ${labeled.length} known face(s)`, "success");
    }
  };

  const handleStart = async () => {
    if (!modelsLoaded) {
      setError("Models still loading");
      return;
    }
    setError("");
    try {
      await buildKnownMatcher();
      await surveillanceAPI.start().catch(() => {});
      setStatus("running");
      addMessage("Surveillance started", "success");
      loopRef.current = setInterval(detectLoop, DETECT_INTERVAL_MS);
    } catch (err) {
      setError(err.message || "Failed to start");
    }
  };

  const handleStop = async () => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    setStatus("ready");
    addMessage("Surveillance stopped", "info");
    await surveillanceAPI.stop().catch(() => {});

    const canvas = canvasRef.current;
    if (canvas && canvas.getContext) {
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const detectLoop = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended || !video.videoWidth) return;

    try {
      const results = await detectInVideo(video, matcherRef.current);

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const r of results) {
        const { x, y, width, height } = r.box;
        const unknown = r.label === "unknown";
        ctx.strokeStyle = unknown ? "#ef4444" : "#22c55e";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        const labelText = unknown
          ? "UNKNOWN"
          : `${r.label.split(":").slice(1).join(":")} (${r.distance.toFixed(2)})`;
        ctx.fillStyle = unknown ? "rgba(239,68,68,0.9)" : "rgba(34,197,94,0.9)";
        ctx.fillRect(x, Math.max(0, y - 24), Math.min(width, 260), 24);
        ctx.fillStyle = "white";
        ctx.font = "14px sans-serif";
        ctx.fillText(labelText, x + 4, Math.max(14, y - 6));
      }

      const now = Date.now();
      for (const r of results) {
        if (r.label === "unknown") {
          if (now - lastUnknownRef.current < UNKNOWN_COOLDOWN_MS) continue;
          lastUnknownRef.current = now;

          const blob = await captureVideoFrame(video);
          if (blob) {
            const fd = new FormData();
            fd.append("image", blob, "unknown.jpg");
            try {
              await unknownAPI.capture(fd);
              addMessage("Unknown person detected — saved", "warning");
            } catch {
              addMessage("Upload failed", "error");
            }
          }
        } else {
          const last = lastKnownRef.current.get(r.label) || 0;
          if (now - last < KNOWN_COOLDOWN_MS) continue;
          lastKnownRef.current.set(r.label, now);
          const [kind, name] = r.label.split(":");
          addMessage(`${name} (${kind}) detected`, "success");
        }
      }
    } catch (err) {
      console.warn("detect loop error", err);
    }
  };

  const messageClass = (type) => {
    switch (type) {
      case "success":
        return "bg-green-100 border-green-400 text-green-700";
      case "warning":
        return "bg-yellow-100 border-yellow-400 text-yellow-700";
      case "error":
        return "bg-red-100 border-red-400 text-red-700";
      default:
        return "bg-blue-100 border-blue-400 text-blue-700";
    }
  };

  const isRunning = status === "running";
  const isLoading = status === "loading";

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Surveillance</h1>
              <p className="text-gray-600 text-sm">
                Face recognition runs locally in your browser. No server upload
                until an unknown face is spotted.
              </p>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Dashboard
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
              Loading face recognition models… (~5 MB, cached after first load)
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center mb-4">
            <button
              onClick={handleStart}
              disabled={!modelsLoaded || isRunning || isLoading}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded transition disabled:opacity-50"
            >
              {isRunning ? "Running" : "Start"}
            </button>
            <button
              onClick={handleStop}
              disabled={!isRunning}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded transition disabled:opacity-50"
            >
              Stop
            </button>
            <div className="text-sm text-gray-600 ml-auto">
              {isRunning
                ? `🔴 Live · ${matcherSize} known`
                : modelsLoaded
                ? "⚪ Ready"
                : "⏳ Loading models"}
            </div>
          </div>

          <div
            className="relative bg-black rounded-lg overflow-hidden mx-auto"
            style={{ maxWidth: 640 }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="block w-full h-auto"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Detection Log</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Nothing yet. Click Start.
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`border-l-4 px-4 py-2 rounded text-sm ${messageClass(
                    msg.type
                  )}`}
                >
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold">{msg.text}</span>
                    <span className="text-xs opacity-75 whitespace-nowrap">
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
