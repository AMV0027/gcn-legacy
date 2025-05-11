import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";

function OnlineVideos({ videos = [] }) {
  const [showVideos, setShowVideos] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setShowVideos(!showVideos)}
        className="border text-sm flex items-center justify-center gap-2 hover:text-blue-400 hover:border-blue-400/30 border-zinc-700/50 text-poppins rounded-lg p-2 transition-all duration-300 bg-zinc-800/50 hover:bg-zinc-700/50"
      >
        Reference Videos <FaPlus className="text-blue-400" />
      </button>

      <div className="flex flex-col gap-3">
        {showVideos &&
          videos.map((video, index) => (
            <div
              key={index}
              className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden border border-zinc-700/50"
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video}?modestbranding=1&rel=0&showinfo=0&controls=1`}
                className="w-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ))}
      </div>
    </div>
  );
}

export default OnlineVideos;
