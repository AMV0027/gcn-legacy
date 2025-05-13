import React, { useState, useEffect, useRef } from "react";
import { FiZoomIn, FiZoomOut, FiRefreshCw, FiDownload } from "react-icons/fi";

function Image({ src, alt, className, onLoad, onError, ...props }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      resetView();
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isExpanded]);

  const handleClick = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = (e) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = (e) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = src;
    link.download = alt || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e) => {
    e.stopPropagation();
    if (isDragging && scale > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = (e) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.1, 3));
    } else {
      setScale((prev) => Math.max(prev - 0.1, 0.5));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="cursor-pointer transition-transform hover:scale-105"
      >
        <img
          src={src}
          alt={alt}
          className={`w-auto h-full object-cover rounded hover:shadow-2xl ${
            className || ""
          }`}
          onLoad={onLoad}
          onError={onError}
          {...props}
        />
      </button>

      {isExpanded && (
        <div
          className="fixed top-0 left-0 z-[99999] w-screen h-screen bg-black/90 backdrop-blur-md flex justify-center items-center"
          onClick={() => setIsExpanded(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
          }}
        >
          {/* Image Container */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] bg-zinc-900/80 p-4 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image with zoom and drag functionality */}
            <div
              className="relative overflow-hidden w-full h-full flex justify-center items-center"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <img
                ref={imageRef}
                src={src}
                alt={alt}
                className="max-w-full max-h-[75vh] object-contain cursor-move transition-transform"
                style={{
                  transform: `scale(${scale}) translate(${
                    position.x / scale
                  }px, ${position.y / scale}px)`,
                  transformOrigin: "center",
                  userSelect: "none",
                }}
                draggable="false"
              />
            </div>

            {/* Toolbar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-4">
              <button
                className="text-white hover:text-blue-400 transition-colors p-2"
                onClick={zoomIn}
                title="Zoom In"
              >
                <FiZoomIn size={22} />
              </button>
              <button
                className="text-white hover:text-blue-400 transition-colors p-2"
                onClick={zoomOut}
                title="Zoom Out"
              >
                <FiZoomOut size={22} />
              </button>
              <button
                className="text-white hover:text-blue-400 transition-colors p-2"
                onClick={(e) => {
                  e.stopPropagation();
                  resetView();
                }}
                title="Reset Zoom"
              >
                <FiRefreshCw size={22} />
              </button>
              <button
                className="text-white hover:text-blue-400 transition-colors p-2"
                onClick={handleDownload}
                title="Download Image"
              >
                <FiDownload size={22} />
              </button>
            </div>

            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-white hover:text-red-400 bg-black/70 rounded-full p-2 hover:bg-black/90 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Image;
