import React, { useState } from "react";
import { SiBookstack } from "react-icons/si";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import PageTooltip from "./PageTooltip";

function PdfReferences({ references = [] }) {
  const [expandedRefs, setExpandedRefs] = useState({});

  if (!references || references.length === 0) return null;

  const truncate = (str, n) => (str.length > n ? str.slice(0, n) + "…" : str);

  const toggleExpand = (refIndex) => {
    setExpandedRefs((prev) => ({
      ...prev,
      [refIndex]: !prev[refIndex],
    }));
  };

  const getContextForPage = (ref, page) => {
    // Find all contexts that contain this page
    const relevantContexts = ref.context.filter((ctx) => {
      if (ctx.page.includes("-")) {
        const [start, end] = ctx.page.split("-").map(Number);
        return page >= start && page <= end;
      }
      return Number(ctx.page) === Number(page);
    });

    // If no context found
    if (relevantContexts.length === 0) {
      return "No context available for this page";
    }

    // Format the tooltip content
    const content = [];

    // Add contexts (truncate to 200 chars)
    const percentage = Math.round(ref.relevance_score * 100);
    content.push(`Context:`);
    relevantContexts.forEach((ctx) => {
      const pageInfo = ctx.page.includes("-")
        ? `Pages ${ctx.page}`
        : `Page ${ctx.page}`;
      content.push(`\n${pageInfo}:\n${truncate(ctx.text.trim(), 100)}`);
    });

    return content.join("\n");
  };

  return (
    <div className="mt-4 sm:mt-6">
      <div className="mb-2 text-sm sm:text-md flex items-center gap-2">
        <p className="text-blue-400">
          <SiBookstack />
        </p>
        <span className="text-zinc-300">References</span>
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        {references.map((ref, index) => (
          <div
            key={index}
            className="bg-zinc-800/50 rounded-lg mb-2 border border-zinc-700/50 overflow-hidden"
          >
            <div
              className="p-3 flex justify-between items-center cursor-pointer"
              onClick={() => toggleExpand(index)}
            >
              <PageTooltip
                text={
                  `${truncate(ref.pdf_info, 150)}...` ||
                  "No document info available"
                }
              >
                <div className="font-medium text-blue-400 hover:underline cursor-help truncate">
                  {ref.name || "Unnamed Document"}
                </div>
              </PageTooltip>
              {expandedRefs[index] ? <FaChevronUp /> : <FaChevronDown />}
            </div>

            {expandedRefs[index] && (
              <div className="p-3 pt-0 border-t border-zinc-700/30">
                <div className="text-xs text-zinc-400 mb-2">Pages:</div>
                <div className="flex flex-wrap gap-2">
                  {ref.page_numbers
                    ?.sort((a, b) => Number(a) - Number(b))
                    .map((page) => (
                      <PageTooltip
                        key={page}
                        text={getContextForPage(ref, page)}
                      >
                        <a
                          href={`http://localhost:5000/api/pdf?name=${encodeURIComponent(
                            ref.name
                          )}#page=${page}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-zinc-700/50 hover:bg-blue-500/20 rounded-md hover:text-blue-400 transition-all duration-300 cursor-pointer border border-zinc-600/50 hover:border-blue-400/30 block text-xs"
                        >
                          {page}
                        </a>
                      </PageTooltip>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop view */}
      <div className="hidden md:block bg-zinc-800/50 rounded-lg p-3 sm:p-4 border border-zinc-700/50 overflow-x-auto relative">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="text-left border-b border-zinc-700/50">
              <th className="pb-3 text-zinc-300 text-sm">Document</th>
              <th className="pb-3 text-zinc-300 text-sm">Pages</th>
            </tr>
          </thead>
          <tbody>
            {references.map((ref, index) => (
              <tr key={index} className="border-b border-zinc-700/30">
                <td className="py-3">
                  <PageTooltip
                    text={
                      `${truncate(ref.pdf_info, 150)}...` ||
                      "No document info available"
                    }
                  >
                    <div className="font-medium text-blue-400 hover:underline cursor-help">
                      {ref.name || "Unnamed Document"}
                    </div>
                  </PageTooltip>
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    {ref.page_numbers
                      ?.sort((a, b) => Number(a) - Number(b))
                      .map((page) => (
                        <PageTooltip
                          key={page}
                          text={getContextForPage(ref, page)}
                        >
                          <a
                            href={`http://localhost:5000/api/pdf?name=${encodeURIComponent(
                              ref.name
                            )}#page=${page}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-zinc-700/50 hover:bg-blue-500/20 rounded-md hover:text-blue-400 transition-all duration-300 cursor-pointer border border-zinc-600/50 hover:border-blue-400/30 block"
                          >
                            {page}
                          </a>
                        </PageTooltip>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PdfReferences;
