import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/wlogo.png";
import { FaHome, FaExclamationTriangle } from "react-icons/fa";

function Error({ error, resetError }) {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-zinc-950 to-zinc-900 text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 max-w-2xl px-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
          <img src={logo} alt="GCN Logo" className="h-24 sm:h-32 opacity-50" />
          <div className="flex flex-col items-center sm:items-start gap-2">
            <h1 className="text-4xl sm:text-6xl font-semibold font-unbound bg-gradient-to-tr from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
              <FaExclamationTriangle className="text-red-500" />
              Error Occurred
            </h1>
            <p className="text-lg sm:text-xl text-zinc-400 text-center sm:text-left">
              {error?.message || "Something went wrong. Please try again."}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-700/50 px-6 py-3 rounded-lg border border-zinc-700/50 hover:border-blue-400/30 transition-all duration-300 group"
          >
            <FaHome className="text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-zinc-300 group-hover:text-blue-400">
              Return Home
            </span>
          </button>
          {resetError && (
            <button
              onClick={resetError}
              className="flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-700/50 px-6 py-3 rounded-lg border border-zinc-700/50 hover:border-blue-400/30 transition-all duration-300 text-zinc-300 hover:text-blue-400"
            >
              Try Again
            </button>
          )}
        </div>

        <div className="text-sm text-zinc-500 text-center max-w-lg">
          If this error persists, please contact support or try refreshing the
          page. Our team has been notified and is working to resolve any issues.
        </div>
      </div>
    </div>
  );
}

export default Error;
