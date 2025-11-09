import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user"
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Signup successful!");
        navigate("/login");
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("Server error. Try again later.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md space-y-5">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-6">Create Account</h2>
        
        <input 
          type="text" 
          name="name" 
          placeholder="Name" 
          onChange={handleChange} 
          required 
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
        />
        
        <input 
          type="email" 
          name="email" 
          placeholder="Email" 
          onChange={handleChange} 
          required 
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
        />
        
        <input 
          type="password" 
          name="password" 
          placeholder="Password" 
          onChange={handleChange} 
          required 
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
        />

        <select 
          name="role" 
          onChange={handleChange} 
          value={formData.role}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="product team">Product Team</option>
        </select>

        <button 
          type="submit" 
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
}

export default Signup;
