import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { familyAPI } from "../services/api";

export default function FamilyPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const response = await familyAPI.listMembers();
      setMembers(response.data);
    } catch (err) {
      setError("Failed to load family members");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Family Members</h1>
            <p className="text-gray-600">Total: {members.length}</p>
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
                      onError={(e) => (e.target.src = "/placeholder.svg")}
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-800">
                      {member.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Added: {new Date(member.createdAt).toLocaleDateString()}
                    </p>
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
