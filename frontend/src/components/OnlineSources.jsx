import React from "react";
import { BsGlobe2 } from "react-icons/bs";

function OnlineSources({ links = [], metadata = {} }) {
  if (!links || links.length === 0) return null;

  const getLinkMetadata = (link) => {
    const meta = metadata[link] || {
      title: "Loading...",
      description: "",
      image: null,
    };

    const truncatedTitle =
      meta.title.length > 15 ? `${meta.title.slice(0, 15)}...` : meta.title;

    const domain = new URL(link).hostname;
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    return { truncatedTitle, domain, faviconUrl };
  };

  return (
    <div className="w-full mt-2 mb-3 overflow-x-auto flex flex-row justify-start gap-2 rounded-lg pb-2">
      {links.map((link, index) => {
        const { truncatedTitle, domain, faviconUrl } = getLinkMetadata(link);

        return (
          <a
            key={index}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-200 px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg border border-zinc-700/50 hover:border-blue-400/30 whitespace-nowrap"
          >
            <div className="relative w-5 h-5">
              <img
                src={faviconUrl}
                alt={`${domain} favicon`}
                className="w-5 h-5 rounded-full"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div className="absolute inset-0 w-5 h-5 rounded-full bg-zinc-700/50 flex items-center justify-center hidden">
                <BsGlobe2 className="w-3 h-3 text-zinc-400" />
              </div>
            </div>
            <span className="truncate max-w-[120px] sm:max-w-xs text-xs">
              {truncatedTitle}
            </span>
          </a>
        );
      })}
    </div>
  );
}

export default OnlineSources;
