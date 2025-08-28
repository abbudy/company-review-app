import { useState } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Import Auth Context

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth(); // Get login function from context

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/api/auth/register", { name, email, password });
      login(data.token, data.user); // Use context login instead of localStorage directly
      navigate("/"); // Redirect to Home
    } catch (e) {
      setErr(e?.response?.data?.message || "Register failed");
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      {err && <div className="text-red-500 mb-3">{err}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="border p-2 w-full"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border p-2 w-full"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="border p-2 w-full"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-green-600 text-white px-4 py-2 rounded w-full">Register</button>
      </form>
    </div>
  );
}
