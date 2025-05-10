import React from "react";
import { SiBookstack } from "react-icons/si";
import { AiOutlinePlus } from "react-icons/ai";

function RelevantQueries({ queries = [], onQuerySelect }) {
  if (!queries || queries.length === 0) return null;

  return (
    <div className="mt-8 w-full">
      <div className="mb-2 text-md flex items-center gap-2">
        <p className="text-blue-400">
          <SiBookstack />
        </p>
        <span className="text-zinc-300">Related</span>
      </div>
      <div className="border-b border-zinc-700/50 w-full">
        {queries.map((query, index) => (
          <button
            key={index}
            onClick={() => onQuerySelect(query)}
            className="w-full flex flex-between items-center pt-3 pb-3 border-t border-zinc-700/30 hover:text-blue-400 transition-colors duration-300"
          >
            <p className="text-left w-full text-zinc-300 text-sm sm:text-base">
              {query}
            </p>
            <AiOutlinePlus className="text-blue-400" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default RelevantQueries;
