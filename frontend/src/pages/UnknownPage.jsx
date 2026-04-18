import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { unknownAPI, familyAPI, categoryAPI } from "../services/api";
import { getSocket, listenUserNotifications } from "../services/websocket";

export default function UnknownPage() {
  const navigate = useNavigate();
  const [unknowns, setUnknowns] = useState([]);
  const [families, setFamilies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [assignTo, setAssignTo] = useState("");
  const [assignAs, setAssignAs] = useState("family");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();

    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user?._id) return undefined;

    const socket = getSocket();
    const unsubscribe = listenUserNotifications(user._id, () => {
      loadData();
    });
    socket.on("unknown:detected", loadData);

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
      socket.off("unknown:detected", loadData);
    };
  }, []);

  const loadData = async () => {
    try {
      const [unknownRes, familyRes, categoryRes] = await Promise.all([
        unknownAPI.listUnknowns(),
        familyAPI.listMembers(),
        categoryAPI.listCategories()
      ]);

      setUnknowns(unknownRes.data);
      setFamilies(familyRes.data);
      setCategories(categoryRes.data);
      setError("");
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (detectionId) => {
    if (!assignTo) {
      setError("Please select a person or category");
      return;
    }

    try {
      await unknownAPI.assignToKnown({
        detection_id: detectionId,
        assigned_to: assignTo,
        assign_as: assignAs
      });

      setUnknowns((prev) => prev.filter((u) => u._id !== detectionId));
      setAssignTo("");
      setSelectedId(null);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to assign unknown person");
    }
  };

  const handleDelete = async (detectionId) => {
    try {
      await unknownAPI.deleteUnknown(detectionId);
      setUnknowns((prev) => prev.filter((u) => u._id !== detectionId));
    } catch {
      setError("Failed to delete detection");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">Loading...</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Unknown People</h1>
          <p className="text-gray-600 mb-8">
            Review and classify unknown detections
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {unknowns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-xl">
                No unknown people detected yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unknowns.map((unknown) => (
                <div
                  key={unknown._id}
                  className="border border-gray-300 rounded-lg overflow-hidden shadow hover:shadow-lg transition"
                >
                  <div className="aspect-square bg-gray-200 overflow-hidden">
                    <img
                      src={unknown.imageUrl}
                      alt="Unknown"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='%23e5e7eb'/><text x='100' y='105' font-size='20' text-anchor='middle' fill='%239ca3af'>No image</text></svg>";
                      }}
                    />
                  </div>

                  <div className="p-4">
                    <p className="text-gray-600 text-sm">
                      {new Date(unknown.timestamp).toLocaleString()}
                    </p>

                    {selectedId === unknown._id ? (
                      <div className="mt-4 space-y-3">
                        <div className="flex gap-2 text-xs">
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              name={`as-${unknown._id}`}
                              checked={assignAs === "family"}
                              onChange={() => setAssignAs("family")}
                            />
                            Family
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              name={`as-${unknown._id}`}
                              checked={assignAs === "category"}
                              onChange={() => setAssignAs("category")}
                            />
                            Category
                          </label>
                        </div>
                        <input
                          type="text"
                          value={assignTo}
                          onChange={(e) => setAssignTo(e.target.value)}
                          placeholder={
                            assignAs === "family"
                              ? "Family member name"
                              : "Category name (e.g. Milkman)"
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1"
                          list={`suggest-${unknown._id}`}
                        />
                        <datalist id={`suggest-${unknown._id}`}>
                          {(assignAs === "family" ? families : categories).map(
                            (item) => (
                              <option key={item._id} value={item.name} />
                            )
                          )}
                        </datalist>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAssign(unknown._id)}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1 rounded transition"
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => {
                              setSelectedId(null);
                              setAssignTo("");
                            }}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-1 rounded transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setSelectedId(unknown._id)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1 rounded transition"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => handleDelete(unknown._id)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1 rounded transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate("/dashboard")}
            className="w-full mt-8 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
