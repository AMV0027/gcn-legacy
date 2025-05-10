import React, { useState } from "react";

const PageTooltip = ({ text, children }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Truncate text if it's too long
  const truncatedText =
    text.length > 300 ? `${text.substring(0, 300)}...` : text;

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 10,
    });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible && (
        <div
          className="fixed bg-zinc-900/95 text-zinc-200 text-sm rounded-lg shadow-lg border border-blue-400/20 backdrop-blur-sm p-4 min-w-[200px] max-w-[400px] transition-all duration-200 z-[9999]"
          style={{
            top: `${position.y}px`,
            left: `${position.x}px`,
            transform: "translateY(-100%)",
            pointerEvents: "none",
          }}
        >
          <div className="line-clamp-4 text-sm leading-relaxed">
            {truncatedText}
          </div>
          <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-zinc-900/95 border-r border-b border-blue-400/20"></div>
        </div>
      )}
    </>
  );
};

export default PageTooltip;
