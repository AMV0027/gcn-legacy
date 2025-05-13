import React from "react";
import logo from "../assets/wlogo.png";
import RelevantDefaultQueries from "./RelevantDefaultQueries";
import Typewriter from "typewriter-effect";

function HeroSection({ onQuerySelect }) {
  return (
    <div className="flex flex-col justify-center items-center h-auto min-h-[80vh] w-full mx-auto font-poppins overflow-hidden pt-6 pb-8 md:pt-10 md:pb-12">
      {/* Background gradient effect */}
      <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-b from-blue-600/10 via-blue-500/5 to-transparent -z-10 pointer-events-none overflow-hidden"></div>

      {/* Logo and brand name */}
      <div className="flex flex-col items-center select-none mb-4 md:mb-6">
        <div className="flex flex-row items-center gap-1 sm:gap-2">
          <img
            src={logo}
            className="h-10 sm:h-14 md:h-16 lg:h-20 select-none hover:scale-105 transition-transform duration-300"
            alt="GCN Logo"
          />
          <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-gradient-to-tr from-blue-700 via-sky-300 to-blue-700 bg-clip-text">
            GCN
          </p>
        </div>
        <p className="text-sm sm:text-md md:text-lg text-white tracking-wide font-normal mt-1 md:mt-2">
          Global Compliance Navigator
        </p>
      </div>

      {/* Headline with blue gradient */}
      <div className="text-center max-w-xl sm:max-w-2xl mx-auto mb-4 sm:mb-6 md:mb-8 px-3">
        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-l from-zinc-400 via-white to-zinc-400 gap-1">
          Your AI-powered assistant for
          <span className="ml-1 inline-block">
            <Typewriter
              options={{
                strings: [
                  "Compliance questions",
                  "Regulation Research",
                  "Code Retrieval",
                ],
                autoStart: true,
                loop: true,
              }}
            />
          </span>
        </h1>
      </div>

      {/* Example queries */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-3xl px-2 sm:px-4">
        <RelevantDefaultQueries onQuerySelect={onQuerySelect} />
      </div>
    </div>
  );
}

/* Add shimmer effect styles */
const styleTag = document.createElement("style");
styleTag.innerHTML = `
  @keyframes shimmer {
    0% {
      background-position: -200% center;
    }
    100% {
      background-position: 200% center;
    }
  }
  
  .shimmer-text {
    background-size: 200% auto;
    animation: shimmer 3s linear infinite;
  }
`;
document.head.appendChild(styleTag);

export default HeroSection;
