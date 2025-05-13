import React from "react";
import logo from "../assets/wlogo.png";

function Loader() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-zinc-950 to-zinc-900 text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 relative">
        {/* Animated background element */}
        <div className="absolute -z-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
          <div className="relative">
            <img
              src={logo}
              alt="GCN Logo"
              className="h-32 sm:h-40 z-10 relative drop-shadow-lg"
            />
            {/* Ring around logo */}
            <div className="absolute inset-0 border-2 border-blue-400/30 rounded-full animate-ping-slow"></div>
          </div>

          <div className="flex flex-col items-center sm:items-start gap-2">
            <h1 className="text-6xl sm:text-8xl font-semibold font-unbound bg-gradient-to-tr from-blue-600 via-sky-400 to-blue-600 bg-clip-text text-transparent animate-pulse-slow">
              GCN
            </h1>
            <p className="text-xl sm:text-2xl text-zinc-400 relative">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-zinc-400 to-zinc-200">
                Global Compliance Navigator
              </span>
              <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500 to-blue-500/0 transform scale-x-0 animate-progress"></span>
            </p>
          </div>
        </div>

        {/* Modern loading spinner */}
        <div className="mt-4 relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-l-blue-300 border-r-blue-300 animate-spin-slow"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-b-blue-400/30 animate-spin-reverse"></div>
          <div className="absolute inset-2 rounded-full bg-blue-500/10 animate-pulse-slow"></div>
        </div>

        <p className="text-zinc-500 text-sm animate-pulse-slow mt-2">
          Loading your compliance data...
        </p>
      </div>
    </div>
  );
}

export default Loader;

// Add these custom animations to your global CSS or tailwind config
// @keyframes progress {
//   0% { transform: scaleX(0); }
//   50% { transform: scaleX(1); }
//   100% { transform: scaleX(0); }
// }
// animation-progress: progress 2s ease-in-out infinite;
// animation-ping-slow: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
// animation-pulse-slow: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
// animation-spin-slow: spin 3s linear infinite;
// animation-spin-reverse: spin 2s linear infinite reverse;
