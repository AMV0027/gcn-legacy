import React, { useMemo } from "react";
import { FaPaperPlane } from "react-icons/fa";

const defaultQueries = [
  "What are the key IEC and ISO regulations for electrical safety in industrial settings?",
  "How to ensure compliance with ISO 45001 occupational health and safety standards?",
  "What are the IEC requirements for protective equipment in hazardous environments?",
  "How to implement ISO-compliant safety training programs?",
  "What are the latest ISO and IEC updates on workplace safety regulations?",
  "How to maintain compliance documentation as per ISO/IEC standards?",
  "What are the best practices for hazard communication under ISO guidelines?",
  "How to conduct safety inspections in line with ISO 19011 standards?",
  "What are the IEC regulations for construction site electrical installations?",
  "How to align workplace safety protocols with ISO 45001 requirements?",
  "What are the ISO standards for personal protective equipment certification?",
  "How to develop an ISO-based safety management system effectively?",
];

const RelevantDefaultQueries = ({ onQuerySelect }) => {
  const randomQueries = useMemo(() => {
    const shuffled = [...defaultQueries].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, []);

  return (
    <div className="mt-8 w-full max-w-4xl mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {randomQueries.map((query, index) => (
          <button
            key={index}
            onClick={() => onQuerySelect(query)}
            className="relative w-full text-left p-4 bg-zinc-800/40 hover:bg-zinc-700/40 
                     rounded-xl border border-zinc-700/30 hover:border-blue-500/40 
                     transition-all duration-300 group h-36 flex flex-col justify-between 
                     shadow-lg hover:shadow-blue-500/5"
          >
            <div
              className="text-sm text-zinc-300 group-hover:text-blue-400 
                          transition-colors duration-300 line-clamp-3 font-medium"
            >
              {query}
            </div>
            <div className="flex justify-end w-full">
              <FaPaperPlane
                className="w-5 h-5 text-zinc-500 group-hover:text-blue-400 
                                    opacity-50 group-hover:opacity-100 
                                    transition-all duration-300 transform 
                                    group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RelevantDefaultQueries;
