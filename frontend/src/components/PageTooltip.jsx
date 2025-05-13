import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

const PageTooltip = ({ text, children }) => {
  const [position, setPosition] = useState({
    x: 0,
    y: 0,
    positionBelow: false,
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  // Check if we're on a mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Modern, minimal formatting
  const formattedText = text
    .split("\n")
    .map((line, index) => {
      // Section headers
      if (line.endsWith(":")) {
        return `<div class='font-semibold text-blue-500 mb-1 mt-2'>${line.replace(
          /:$/,
          ""
        )}</div>`;
      }
      // Relevance
      if (line.startsWith("Relevance:")) {
        return `<div class='text-xs text-zinc-400 mb-2'>${line}</div>`;
      }
      // Page info
      if (line.startsWith("Page ") || line.startsWith("Pages ")) {
        return `<div class='text-xs text-zinc-400 mt-1 mb-1'>${line}</div>`;
      }
      // Regular text
      return `<div class='text-zinc-200 leading-relaxed'>${line}</div>`;
    })
    .join("");

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate position differently based on device size
    if (isMobile) {
      // On mobile, center the tooltip horizontally
      let x = Math.max(10, (viewportWidth - tooltipRect.width) / 2);

      // Position near the trigger but ensure it's visible
      let y = triggerRect.bottom + 10 + scrollY;

      // If would go below viewport, position it above
      if (y + tooltipRect.height > viewportHeight + scrollY - 10) {
        y = triggerRect.top - tooltipRect.height - 10 + scrollY;
        setPosition({ x, y, positionBelow: false });
      } else {
        setPosition({ x, y, positionBelow: true });
      }
    } else {
      // Desktop positioning logic
      let x =
        triggerRect.left +
        triggerRect.width / 2 -
        tooltipRect.width / 2 +
        scrollX;
      let y = triggerRect.top - tooltipRect.height - 10 + scrollY;

      // Keep tooltip within viewport horizontally
      if (x + tooltipRect.width > viewportWidth - 20) {
        x = viewportWidth - tooltipRect.width - 20;
      }
      if (x < 20) {
        x = 20;
      }

      // If tooltip would go above viewport, position it below the element
      const wouldGoAboveViewport = triggerRect.top - tooltipRect.height < 10;
      if (wouldGoAboveViewport) {
        y = triggerRect.bottom + 10 + scrollY;
        setPosition({ x, y, positionBelow: true });
      } else {
        setPosition({ x, y, positionBelow: false });
      }
    }
  }, [isMobile]);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // For touch devices
  const handleClick = (e) => {
    if (isMobile) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling
      setIsVisible(!isVisible);
    }
  };

  // Update position after tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      // Wait for the tooltip to be rendered
      setTimeout(() => {
        updatePosition();
      }, 0);
    }
  }, [isVisible, updatePosition, text]);

  // Update position on scroll or resize
  useEffect(() => {
    if (!isVisible) return;

    const handleUpdate = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleUpdate);
    window.addEventListener("resize", handleUpdate);

    return () => {
      window.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isVisible, updatePosition]);

  // Close tooltip when clicking outside on mobile
  useEffect(() => {
    if (!isVisible || !isMobile) return;

    const handleOutsideClick = (e) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isVisible, isMobile]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={isMobile ? undefined : handleMouseEnter}
        onMouseLeave={isMobile ? undefined : handleMouseLeave}
        onClick={handleClick}
        className={`inline-block relative ${
          isMobile ? "cursor-pointer" : "cursor-help"
        }`}
        aria-describedby="tooltip"
        tabIndex={isMobile ? 0 : undefined}
      >
        {children}
      </span>
      {isVisible &&
        text &&
        createPortal(
          <div
            ref={tooltipRef}
            id="tooltip"
            role="tooltip"
            className="tooltip-content fixed text-white/95 bg-zinc-800 text-xs sm:text-sm rounded-xl shadow-2xl border-none p-3 sm:p-4 min-w-[200px] sm:min-w-[260px] max-w-[90vw] sm:max-w-[400px] transition-all duration-200 z-[9999] overflow-auto"
            style={{
              top: `${position.y}px`,
              left: `${position.x}px`,
              maxHeight: isMobile ? "40vh" : "260px",
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              boxShadow: "0 8px 32px 0 rgba(60,60,90,0.12)",
            }}
          >
            <div
              className="space-y-1"
              style={{ wordBreak: "break-word" }}
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />
            <div
              className={`absolute ${
                position.positionBelow ? "-top-2" : "-bottom-2"
              } left-1/2 -translate-x-1/2 transform ${
                position.positionBelow ? "-rotate-45" : "rotate-45"
              } w-3 h-3 bg-white border border-zinc-200 shadow-sm`}
              style={{ boxShadow: "0 2px 8px 0 rgba(60,60,90,0.10)" }}
            />
          </div>,
          document.body
        )}
    </>
  );
};

export default PageTooltip;
