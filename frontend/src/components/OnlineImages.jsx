import React, { useState, useEffect, useRef } from "react";
import { FaSpinner, FaPlus, FaTimes } from "react-icons/fa";
import {
  FiZoomIn,
  FiZoomOut,
  FiRefreshCw,
  FiDownload,
  FiRotateCw,
} from "react-icons/fi";
import { MdOutlinePanTool } from "react-icons/md";
import ReactDOM from "react-dom";

function OnlineImages({ images = [] }) {
  const [showImages, setShowImages] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);

  // Modal state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isPanMode, setIsPanMode] = useState(false);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

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

  const openLightbox = (img) => {
    setSelectedImage(img);
    document.body.style.overflow = "hidden";
    // Reset modal state
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setIsPanMode(false);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    document.body.style.overflow = "auto";
  };

  const resetView = (e) => {
    if (e) e.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setIsPanMode(false);
  };

  const zoomIn = (e) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = (e) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const togglePanMode = (e) => {
    e.stopPropagation();
    setIsPanMode((prev) => !prev);
  };

  const rotateImage = (e) => {
    e.stopPropagation();
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = selectedImage;
    link.download = selectedImage.split("/").pop() || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    if (isPanMode || scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });

      // Change cursor during drag
      if (containerRef.current) {
        containerRef.current.style.cursor = "grabbing";
      }
    }
  };

  const handleTouchStart = (e) => {
    e.stopPropagation();
    if (isPanMode || scale > 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e) => {
    e.stopPropagation();
    if (isDragging && (isPanMode || scale > 1)) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleTouchMove = (e) => {
    e.stopPropagation();
    if (isDragging && (isPanMode || scale > 1)) {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = (e) => {
    e.stopPropagation();
    setIsDragging(false);

    // Reset cursor after drag
    if (containerRef.current) {
      containerRef.current.style.cursor = isPanMode
        ? "grab"
        : scale > 1
        ? "move"
        : "default";
    }
  };

  const handleTouchEnd = (e) => {
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

  // If there are no images, don't render anything
  if (!images || images.length === 0) {
    return null;
  }

  // Render lightbox as a portal
  const renderLightbox = () => {
    if (!selectedImage) return null;

    return ReactDOM.createPortal(
      <div
        className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm"
        onClick={closeLightbox}
      >
        <div
          className="relative w-full h-full flex justify-center items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image container with zoom and drag functionality */}
          <div
            ref={containerRef}
            className="relative overflow-hidden w-full h-full flex justify-center items-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{
              cursor: isDragging
                ? "grabbing"
                : isPanMode
                ? "grab"
                : scale > 1
                ? "move"
                : "default",
            }}
          >
            <img
              ref={imageRef}
              src={selectedImage}
              alt="Full size image"
              className="w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-lg transition-transform duration-200"
              style={{
                transform: `scale(${scale}) translate(${
                  position.x / scale
                }px, ${position.y / scale}px) rotate(${rotation}deg)`,
                transformOrigin: "center",
                userSelect: "none",
              }}
              draggable="false"
            />

            {/* Pan mode indicator */}
            {isPanMode && (
              <div className="absolute top-4 left-4 bg-blue-500/70 text-white px-3 py-1 rounded-full text-sm">
                Pan Mode Active
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-zinc-700/70 backdrop-blur-md border border-blue-500/80 rounded-full px-4 py-2 flex items-center gap-4">
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
              className={`text-white transition-colors p-2 ${
                isPanMode ? "text-blue-400" : "hover:text-blue-400"
              }`}
              onClick={togglePanMode}
              title="Pan Mode"
            >
              <MdOutlinePanTool size={22} />
            </button>
            <button
              className="text-white hover:text-blue-400 transition-colors p-2"
              onClick={rotateImage}
              title="Rotate Image"
            >
              <FiRotateCw size={22} />
            </button>
            <button
              className="text-white hover:text-blue-400 transition-colors p-2"
              onClick={resetView}
              title="Reset View"
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
        </div>

        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-white hover:text-red-400 bg-black/70 rounded-full p-2 hover:bg-black/90 transition-colors"
          onClick={closeLightbox}
          aria-label="Close lightbox"
        >
          <FaTimes size={20} />
        </button>
      </div>,
      document.getElementById("modal-root")
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setShowImages(!showImages)}
        className="border text-xs sm:text-sm flex items-center justify-center gap-2 hover:text-blue-400 hover:border-blue-400/30 border-zinc-700/50 text-poppins rounded-lg p-1.5 sm:p-2 transition-all duration-300 bg-zinc-800/50 hover:bg-zinc-700/50"
        aria-expanded={showImages}
      >
        Reference Images <FaPlus className="text-blue-400" />
      </button>

      {showImages && (
        <div className="w-full overflow-x-auto sm:overflow-x-visible pb-2">
          <div className="flex flex-row sm:flex-col sm:flex-wrap justify-start sm:items-center gap-4 min-w-min">
            {images.map((img, index) => {
              if (imageErrors[img]) return null;

              return (
                <div
                  key={index}
                  className="relative w-[200px] min-w-[200px] h-[140px] sm:w-full sm:h-[220px] rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => openLightbox(img)}
                >
                  {!loadedImages[img] && (
                    <div className="absolute inset-0 bg-zinc-800/50 flex items-center justify-center rounded-lg">
                      <FaSpinner className="animate-spin text-blue-400" />
                    </div>
                  )}
                  <img
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
        </div>
      )}

      {renderLightbox()}
    </div>
  );
}

export default OnlineImages;
