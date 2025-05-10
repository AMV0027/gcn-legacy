import React from "react";
import logo from "../assets/wlogo.png";
import RelevantDefaultQueries from "./RelevantDefaultQueries";

function HeroSection({ onQuerySelect }) {
  return (
    <div className="flex flex-col justify-center items-center h-full font-poppins translate-y-[-80px]">
      <div className="flex flex-col sm:flex-row gap-2 items-center select-none animate-fade-in">
        <img
          src={logo}
          className="h-32 sm:h-40 select-none hover:scale-105 transition-transform duration-300"
          alt="GCN Logo"
        />
        <p className="text-6xl sm:text-8xl font-semibold font-unbound bg-gradient-to-tr from-blue-600 via-sky-400 to-blue-600 bg-clip-text text-transparent">
          GCN
        </p>
      </div>
      <p className="relative -top-6 text-xl sm:text-2xl text-zinc-400">
        Global Compliance Navigator
      </p>
      <h2 className="text-2xl sm:text-4xl font-thin text-zinc-500 text-center mt-2">
        What do you want to know about compliance?
      </h2>

      <RelevantDefaultQueries onQuerySelect={onQuerySelect} />
    </div>
  );
}

export default HeroSection;
