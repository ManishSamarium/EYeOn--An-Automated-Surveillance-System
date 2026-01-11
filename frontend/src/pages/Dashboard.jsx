import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  surveillanceAPI,
  familyAPI,
  categoryAPI,
  unknownAPI,
} from "../services/api";
import { getSocket } from "../services/websocket";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    family_count: 0,
    category_count: 0,
    unknown_count: 0,
    surveillance_running: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    const socket = getSocket();
    socket.on("family:updated", loadStats);
    socket.on("category:updated", loadStats);
    socket.on("unknown:detected", loadStats);

    return () => {
      socket.off("family:updated", loadStats);
      socket.off("category:updated", loadStats);
      socket.off("unknown:detected", loadStats);
    };
  }, []);

  const loadStats = async () => {
    try {
      const [familyRes, categoryRes, unknownRes, statusRes] = await Promise.all(
        [
          familyAPI.listMembers(),
          categoryAPI.listCategories(),
          unknownAPI.listUnknowns(),
          surveillanceAPI.getStatus(),
        ]
      );

      setStats({
        family_count: familyRes.data.length,
        category_count: categoryRes.data.length,
        unknown_count: unknownRes.data.length,
        surveillance_running: statusRes.data.is_running,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">EYeOn Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            title="Family Members"
            count={stats.family_count}
            color="bg-blue-500"
            icon="👨‍👩‍👧‍👦"
          />
          <StatCard
            title="Categories"
            count={stats.category_count}
            color="bg-green-500"
            icon="🏷️"
          />
          <StatCard
            title="Unknown People"
            count={stats.unknown_count}
            color="bg-yellow-500"
            icon="❓"
          />
          <StatCard
            title="Surveillance"
            count={stats.surveillance_running ? "Active" : "Inactive"}
            color={stats.surveillance_running ? "bg-red-500" : "bg-gray-500"}
            icon="📹"
          />
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ActionCard
            title="Add Family Member"
            description="Add a new family member to the system"
            onClick={() => navigate("/add-family")}
            icon="➕"
            color="blue"
          />
          <ActionCard
            title="Manage Categories"
            description="Add or manage categories like Maid, Milkman"
            onClick={() => navigate("/categories")}
            icon="📋"
            color="green"
          />
          <ActionCard
            title="Start Surveillance"
            description="Begin real-time face recognition"
            onClick={() => navigate("/surveillance")}
            icon="📹"
            color="red"
          />
          <ActionCard
            title="Review Family"
            description="View all family members"
            onClick={() => navigate("/family")}
            icon="👥"
            color="purple"
          />
          <ActionCard
            title="Unknown People"
            description="Review and classify unknown detections"
            onClick={() => navigate("/unknown")}
            icon="🔍"
            color="yellow"
          />
          <ActionCard
            title="Notifications"
            description="View detection notifications"
            onClick={() => navigate("/notifications")}
            icon="🔔"
            color="indigo"
          />
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, count, color, icon }) {
  return (
    <div className={`${color} text-white rounded-lg shadow p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-100 text-sm">{title}</p>
          <p className="text-4xl font-bold mt-2">{count}</p>
        </div>
        <span className="text-5xl opacity-30">{icon}</span>
      </div>
    </div>
  );
}

function ActionCard({ title, description, onClick, icon, color }) {
  const colorMap = {
    blue: "hover:border-blue-500 hover:shadow-lg hover:shadow-blue-200",
    green: "hover:border-green-500 hover:shadow-lg hover:shadow-green-200",
    red: "hover:border-red-500 hover:shadow-lg hover:shadow-red-200",
    purple: "hover:border-purple-500 hover:shadow-lg hover:shadow-purple-200",
    yellow: "hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-200",
    indigo: "hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-200",
  };

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-lg shadow p-6 text-left border-2 border-transparent transition ${colorMap[color]}`}
    >
      <span className="text-4xl mb-4 block">{icon}</span>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </button>
  );
}
