import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { categoryAPI } from "../services/api";
import { getSocket } from "../services/websocket";

export default function CategoriesPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadCategories();
    const socket = getSocket();
    socket.on("category:updated", loadCategories);
    return () => socket.off("category:updated", loadCategories);
  }, []);

  const loadCategories = async () => {
    try {
      const res = await categoryAPI.listCategories();
      setCategories(res.data);
    } catch {
      /* non-fatal */
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(f);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const data = new FormData();
      data.append("name", name);
      data.append("description", description);
      data.append("file", file);

      await categoryAPI.addCategory(data);

      setSuccess(`Category '${name}' created!`);
      setName("");
      setDescription("");
      setFile(null);
      setPreview(null);
      loadCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add category");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, catName) => {
    if (!window.confirm(`Delete category ${catName}?`)) return;
    try {
      await categoryAPI.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Add Category</h1>
          <p className="text-gray-600 mb-8">
            Create a new category (Maid, Milkman, etc.)
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">
                Category Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="e.g., Milkman, Maid, Delivery"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="Optional description"
                rows="3"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-2">
                Reference Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full"
                required
              />
              {preview && (
                <div className="mt-4">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Category"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Existing Categories ({categories.length})
          </h2>
          {categories.length === 0 ? (
            <p className="text-gray-500">No categories yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => (
                <div key={c._id} className="border rounded-lg p-4 flex gap-4">
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    className="w-20 h-20 object-cover rounded"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><rect width='80' height='80' fill='%23e5e7eb'/></svg>";
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="font-bold">{c.name}</h3>
                    <p className="text-sm text-gray-600">{c.description}</p>
                    <button
                      onClick={() => handleDelete(c._id, c.name)}
                      className="text-red-500 text-sm mt-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
