import { useState } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      login(data.token, data.user);
      navigate("/");
      console.log("Backend user data:", data.user);

    } catch (e) {
      setErr(e?.response?.data?.message || "Login failed");
      
    }
    

    
  }

  

  return (
    <div className="max-w-sm mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      {err && <div className="text-red-500 mb-3">{err}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="border p-2 w-full" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="border p-2 w-full" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="bg-blue-600 text-white px-4 py-2 rounded w-full">Login</button>
      </form>
    </div>

    
  );
}
