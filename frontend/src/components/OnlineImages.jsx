import React, { useState, useEffect } from "react";
import { FaSpinner, FaPlus } from "react-icons/fa";
import Image from "./Image";

function OnlineImages({ images = [] }) {
  const [showImages, setShowImages] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});
  const [imageErrors, setImageErrors] = useState({});

  // Reset states when images prop changes
  useEffect(() => {
    setLoadedImages({});
    setImageErrors({});
  }, [images]);

  const handleImageLoad = (imageUrl) => {
    setLoadedImages((prev) => ({
      ...prev,
      [imageUrl]: true,
    }));
  };

  const handleImageError = (imageUrl) => {
    setImageErrors((prev) => ({
      ...prev,
      [imageUrl]: true,
    }));
    console.error(`Failed to load image: ${imageUrl}`);
  };

  // If there are no images, don't render anything
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setShowImages(!showImages)}
        className="border text-sm flex items-center justify-center gap-2 hover:text-blue-400 hover:border-blue-400/30 border-zinc-700/50 text-poppins rounded-lg p-2 transition-all duration-300 bg-zinc-800/50 hover:bg-zinc-700/50"
      >
        Reference Images <FaPlus className="text-blue-400" />
      </button>
      <div>
        {showImages && (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${
              showImages ? "opacity-100" : "opacity-0"
            } transition-all duration-500 ease-in-out`}
          >
            {images.map((img, index) => {
              if (imageErrors[img]) return null;

              return (
                <div key={index} className="relative aspect-video">
                  {!loadedImages[img] && (
                    <div className="absolute inset-0 bg-zinc-800/50 flex items-center justify-center rounded-lg">
                      <FaSpinner className="animate-spin text-blue-400" />
                    </div>
                  )}
                  <Image
                    src={img}
                    alt={`Online image ${index + 1}`}
                    className={`w-full h-full object-cover rounded-lg transition-opacity duration-300 ${
                      loadedImages[img] ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => handleImageLoad(img)}
                    onError={() => handleImageError(img)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default OnlineImages;
