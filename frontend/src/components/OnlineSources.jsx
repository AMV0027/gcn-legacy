import React, { useState } from "react";
import { BsGlobe2 } from "react-icons/bs";
import { FaExternalLinkAlt } from "react-icons/fa";

function OnlineSources({ links = [], metadata = {} }) {
  const [expandedLinks, setExpandedLinks] = useState({});

  if (!links || links.length === 0) return null;

  const toggleLinkExpansion = (link) => {
    setExpandedLinks({
      ...expandedLinks,
      [link]: !expandedLinks[link],
    });
  };

  const getLinkMetadata = (link) => {
    const meta = metadata[link] || {
      title: "Loading...",
      description: "",
      image: null,
    };

    // Get title for display
    let displayTitle = meta.title || link;
    const truncatedTitle =
      displayTitle.length > 15
        ? `${displayTitle.slice(0, 15)}...`
        : displayTitle;

    // Extract domain for favicon
    let domain;
    try {
      domain = new URL(link).hostname;
    } catch (e) {
      domain = "website.com";
    }
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    return { displayTitle, truncatedTitle, domain, faviconUrl };
  };

  return (
    <div className="w-full mt-1 mb-2 md:mt-2 md:mb-3">
      <div className="overflow-x-auto scrollbar-hide flex flex-row flex-wrap gap-1.5 sm:gap-2 pb-1 sm:pb-2">
        {links.map((link, index) => {
          const { truncatedTitle, domain, faviconUrl } = getLinkMetadata(link);
          const isExpanded = expandedLinks[link];

          return (
            <div key={index} className="flex-none relative group">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1.5 sm:gap-2 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-200 
                px-2 py-1 sm:py-1.5 rounded-lg transition-all duration-300 transform hover:scale-[1.02] 
                border border-zinc-700/50 hover:border-blue-400/30 ${
                  isExpanded ? "border-blue-400/30" : ""
                }`}
              >
                <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0">
                  <img
                    src={faviconUrl}
                    alt={`${domain} favicon`}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                  <div className="absolute inset-0 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-zinc-700/50 flex items-center justify-center hidden">
                    <BsGlobe2 className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-zinc-400" />
                  </div>
                </div>
                <span className="truncate max-w-[70px] xs:max-w-[100px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-xs text-[10px] xs:text-xs">
                  {truncatedTitle}
                </span>
                <span className="text-blue-400">
                  <FaExternalLinkAlt className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                </span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OnlineSources;
