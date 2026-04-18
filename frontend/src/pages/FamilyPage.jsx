import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { familyAPI } from "../services/api";
import { getSocket } from "../services/websocket";

export default function FamilyPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadMembers();
    const socket = getSocket();
    socket.on("family:updated", loadMembers);
    return () => socket.off("family:updated", loadMembers);
  }, []);

  const loadMembers = async () => {
    try {
      const response = await familyAPI.listMembers();
      setMembers(response.data);
      setError("");
    } catch {
      setError("Failed to load family members");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await familyAPI.deleteMember(id);
      setMembers((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete");
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
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Family Members</h1>
              <p className="text-gray-600">Total: {members.length}</p>
            </div>
            <button
              onClick={() => navigate("/add-family")}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded transition"
            >
              + Add Member
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {members.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-xl mb-4">
                No family members added yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="border border-gray-300 rounded-lg overflow-hidden shadow hover:shadow-lg transition"
                >
                  <div className="aspect-square bg-gray-200 overflow-hidden">
                    <img
                      src={member.imageUrl}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='%23e5e7eb'/><text x='100' y='105' font-size='24' text-anchor='middle' fill='%239ca3af'>No image</text></svg>";
                      }}
                    />
                  </div>

                  <div className="p-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">
                        {member.name}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Added: {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(member._id, member.name)}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold"
                    >
                      Delete
                    </button>
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
