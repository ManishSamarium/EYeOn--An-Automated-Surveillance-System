import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { unknownAPI, familyAPI, categoryAPI } from "../services/api";
import { getSocket } from "../services/websocket";
import { generatePlaceholderImage } from "../utils/imageGenerator";

// Allow reconstructing Cloudinary URL if backend only returns public_id
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const buildCloudinaryUrl = (publicId) =>
  publicId && cloudName
    ? `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`
    : null;

export default function UnknownPage() {
  const navigate = useNavigate();
  const [unknowns, setUnknowns] = useState([]);
  const [families, setFamilies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [assignTo, setAssignTo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
    
    // Listen for real-time unknown detection
    const socket = getSocket();
    const user = JSON.parse(localStorage.getItem("user"));
    
    if (socket) {
      socket.on("unknown:detected", (data) => {
        console.log("✓ Unknown detected:", data);
        loadData();
        // Play sound alert
        try {
          new Audio("/alarm.mp3").play().catch(() => {});
        } catch (e) {
          console.log("Audio play not available");
        }
      });

      socket.on("unknown:classified", (data) => {
        console.log("✓ Unknown classified:", data);
        loadData();
      });

      socket.on("unknown:deleted", (id) => {
        console.log("✓ Unknown deleted:", id);
        setUnknowns(unknowns.filter((u) => u._id !== id));
      });
    }

    return () => {
      if (socket) {
        socket.off("unknown:detected");
        socket.off("unknown:classified");
        socket.off("unknown:deleted");
      }
    };
  }, [unknowns]);

  const loadData = async () => {
    try {
      const [unknownRes, familyRes, categoryRes] = await Promise.all([
        unknownAPI.listUnknowns(),
        familyAPI.listMembers(),
        categoryAPI.listCategories(),
      ]);

      console.log("Unknown detections loaded:", unknownRes.data);
      setUnknowns(unknownRes.data);
      setFamilies(familyRes.data);
      setCategories(categoryRes.data);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (detectionId, imageUrl) => {
    if (!assignTo) return setError("Please select a person or category");

    try {
      await unknownAPI.assignToKnown(detectionId, {
        assignToFamily: assignTo.startsWith("family-") ? assignTo.replace("family-", "") : null,
        assignToCategory: assignTo.startsWith("category-") ? assignTo.replace("category-", "") : null
      });

      setUnknowns(unknowns.filter((u) => u._id !== detectionId));
      setAssignTo("");
      setSelectedId(null);
    } catch {
      setError("Failed to assign unknown person");
    }
  };

  const handleDelete = async (detectionId) => {
    try {
      await unknownAPI.deleteUnknown(detectionId);
      setUnknowns(unknowns.filter((u) => u._id !== detectionId));
    } catch {
      setError("Failed to delete detection");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Are you sure you want to delete all ${unknowns.length} detections?`)) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all(unknowns.map((u) => unknownAPI.deleteUnknown(u._id)));
      setUnknowns([]);
      setError("");
    } catch {
      setError("Failed to delete all detections");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAll = async () => {
    try {
      setLoading(true);
      await Promise.all(
        unknowns.map((u) =>
          unknownAPI.assignToKnown(u._id, {
            assignToFamily: null,
            assignToCategory: null
          })
        )
      );
      setUnknowns([]);
      setError("");
    } catch {
      setError("Failed to process all detections");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Unknown People</h1>
          <p className="text-gray-600 mb-8">Review and classify unknown detections</p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {unknowns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-xl">No unknown people detected yet</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unknowns.map((unknown) => (
                <div key={unknown._id} className="border border-gray-300 rounded-lg overflow-hidden shadow hover:shadow-lg transition">
                  <div className="aspect-square bg-gray-200 overflow-hidden flex items-center justify-center">
                    {(() => {
                      const imageSrc = unknown.imageUrl || buildCloudinaryUrl(unknown.cloudinaryPublicId);
                      const fallback = generatePlaceholderImage(`Detection ${unknown._id.slice(-4)}`);
                      return (
                        <img
                          src={imageSrc || fallback}
                          alt="Unknown"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn("Image failed to load:", imageSrc);
                            e.target.onerror = null;
                            e.target.src = fallback;
                          }}
                        />
                      );
                    })()}
                  </div>

                  <div className="p-4">
                    <p className="text-gray-600 text-sm">{new Date(unknown.timestamp).toLocaleString()}</p>

                    {selectedId === unknown._id ? (
                      <div className="mt-4 space-y-3">
                        <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1">
                          <option value="">Select person or category</option>
                          {families.map((f) => <option key={f._id} value={f.name}>{f.name} (Family)</option>)}
                          {categories.map((c) => <option key={c._id} value={c.name}>{c.name} (Category)</option>)}
                        </select>

                        <div className="flex gap-2">
                          <button onClick={() => handleAssign(unknown._id, unknown.imageUrl)} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1 rounded transition">Assign</button>
                          <button onClick={() => { setSelectedId(null); setAssignTo(""); }} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-1 rounded transition">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => setSelectedId(unknown._id)} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1 rounded transition">Assign</button>
                        <button onClick={() => handleDelete(unknown._id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1 rounded transition">Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </>
          )}

          <button onClick={() => navigate("/dashboard")} className="w-full mt-8 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
