import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";

function OnlineVideos({ videos = [] }) {
  const [showVideos, setShowVideos] = useState(false);

  if (!videos || videos.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={() => setShowVideos(!showVideos)}
        className="border text-xs sm:text-sm flex items-center justify-center gap-2 hover:text-blue-400 hover:border-blue-400/30 border-zinc-700/50 text-poppins rounded-lg p-1.5 sm:p-2 transition-all duration-300 bg-zinc-800/50 hover:bg-zinc-700/50"
        aria-expanded={showVideos}
      >
        Reference Videos <FaPlus className="text-blue-400" />
      </button>

      {showVideos && (
        <div className="w-full overflow-x-auto sm:overflow-x-visible pb-2">
          <div className="flex flex-row sm:flex-col justify-start sm:items-center gap-4 min-w-min">
            {videos.map((video, index) => (
              <div
                key={index}
                className="w-[200px] min-w-[200px] h-[120px] sm:w-full sm:max-w-full relative rounded-lg overflow-hidden border border-zinc-700/50"
              >
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video}?modestbranding=1&rel=0&showinfo=0&controls=1`}
                  className="absolute top-0 left-0 w-full h-[120px] rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  modestbranding="1"
                  rel="0"
                  showinfo="0"
                  controls="1"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title={`YouTube video ${index + 1}`}
                  loading="lazy"
                  style={{ aspectRatio: "16/9" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default OnlineVideos;
