import React from "react";
import logo from "../assets/wlogo.png";

function Loader() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-zinc-950 to-zinc-900 text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
          <img
            src={logo}
            alt="GCN Logo"
            className="h-32 sm:h-40 animate-pulse"
          />
          <div className="flex flex-col items-center sm:items-start gap-2">
            <h1 className="text-6xl sm:text-8xl font-semibold font-unbound bg-gradient-to-tr from-blue-600 via-sky-400 to-blue-600 bg-clip-text text-transparent">
              GCN
            </h1>
            <p className="text-xl sm:text-2xl text-zinc-400">
              Global Compliance Navigator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full bg-blue-500 animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-3 h-3 rounded-full bg-blue-500 animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-3 h-3 rounded-full bg-blue-500 animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

export default Loader;
