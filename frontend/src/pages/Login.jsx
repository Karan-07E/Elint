import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LuMail, 
  LuLock, 
  LuEye, 
  LuEyeOff, 
  LuArrowRight,
} from "react-icons/lu";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  
  // UI State for password visibility toggle
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Store the JWT token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Trigger auth change event to update App component
        window.dispatchEvent(new Event('authChange'));
        
        // Redirect based on user role
        if (data.user.role === 'product team') {
          navigate("/items");
        } else {
          navigate("/"); // redirects to home page for admin and user
        }
      } else {
        alert(data.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full font-sans">
      
      {/* Left Side - Branding (Professional Blue Theme) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col justify-center items-center text-white p-12 relative overflow-hidden">
        
        {/* Ambient Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        </div>

        <div className="z-10 text-center flex flex-col items-center">
          
          {/* LOGO: Use uploaded Elints image */}
          <div className="w-24 h-24 mb-8 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-xl opacity-20"></div>
            <div className="relative w-full h-full rounded-2xl shadow-2xl flex items-center justify-center bg-slate-900 border border-white/10 overflow-hidden">
              <img
                src={process.env.PUBLIC_URL + '/elintslogo.png'}
                alt="Elints"
                className="w-20 h-20 object-contain relative z-10"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = process.env.PUBLIC_URL + '/logo192.png'; }}
              />
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Elints ERP
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
            Streamline your manufacturing, sales, and inventory in one unified platform.
          </p>
        </div>
        
        <div className="absolute bottom-8 text-slate-600 text-xs font-medium tracking-wide">
          © {new Date().getFullYear()} ELINTS SYSTEMS. ALL RIGHTS RESERVED.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white w-full max-w-md p-10 rounded-2xl shadow-xl border border-slate-100">
          
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome Back</h2>
            <p className="text-slate-500 text-sm">Please enter your details to sign in</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LuMail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700 block">Password</label>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LuLock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg shadow-blue-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  Sign In <LuArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer (Optional Link) */}
          <div className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <span className="text-blue-600 font-medium cursor-pointer hover:underline">
              Contact Admin
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;