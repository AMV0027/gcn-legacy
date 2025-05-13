import React, { useState } from "react";
import axios from "axios";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import logo from "../assets/wlogo.png";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const endpoint = isLogin
        ? "http://localhost:5000/api/login"
        : "http://localhost:5000/api/signup";
      const payload = isLogin
        ? { username, password }
        : { username, email, password };

      const response = await axios.post(endpoint, payload);

      if (isLogin) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userId", response.data.userId);
        window.location.href = "/home";
      } else {
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Blue gradient glow effects */}
      <div className="absolute top-1/4 -left-24 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-[60px] opacity-20 animate-pulse delay-1000"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-zinc-950/60 rounded-2xl shadow-inner shadow-blue-500/50  border border-zinc-700 p-10 backdrop-blur-xl">
          <div className="flex gap-3 items-center w-full justify-center mb-5">
            <img src={logo} className="w-16 h-16 object-contain" alt="Logo" />
            <h2 className="text-transparent font-poppins font-bold text-5xl  bg-clip-text bg-gradient-to-l from-blue-500 via-sky-300 to-blue-500">
              GCN
            </h2>
          </div>

          <h2 className="text-center text-2xl font-medium text-white mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>

          <p className="text-center text-gray-400 mb-8 text-sm">
            {isLogin
              ? "Sign in to access your account"
              : "Fill in your details to get started"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <FaUser className="absolute left-3 z-3  top-1/2 transform -translate-y-1/2 text-blue-500 group-hover:text-blue-400 transition-colors" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                className="w-full pl-10 pr-3 py-3.5 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {!isLogin && (
              <div className="relative group">
                <FaEnvelope className="absolute left-3 z-3  top-1/2 transform -translate-y-1/2 text-blue-500 group-hover:text-blue-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required={!isLogin}
                  className="w-full pl-10 pr-3 py-3.5 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            <div className="relative group">
              <FaLock className="absolute left-3 z-3  top-1/2 transform -translate-y-1/2 text-blue-500 group-hover:text-blue-400 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full pl-10 pr-3 py-3.5 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm bg-red-500 bg-opacity-5 border border-red-500 border-opacity-30 rounded-lg p-3 flex items-center">
                <div className="w-1 h-full bg-red-500 mr-3"></div>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl text-white font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg  hover:border-blue-500 hover:border-1"
            >
              {isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="text-center mt-8">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-gray-400 hover:text-blue-400 transition-colors text-sm font-medium"
            >
              {isLogin
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </button>
          </div>

          {isLogin && (
            <div className="mt-8 pt-6 border-t border-zinc-700">
              <p className="text-center text-xs text-gray-500">
                By signing in, you agree to our{" "}
                <a href="#" className="text-blue-500 hover:text-blue-400">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-blue-500 hover:text-blue-400">
                  Privacy Policy
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
