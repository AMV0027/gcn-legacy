import React from "react";
import { SiBookstack } from "react-icons/si";
import PageTooltip from "./PageTooltip";

function PdfReferences({ references = [] }) {
  if (!references || references.length === 0) return null;

  const getContextForPage = (ref, page) => {
    return (
      ref.context.find((ctx) => {
        if (ctx.page.includes("-")) {
          const [start, end] = ctx.page.split("-").map(Number);
          return page >= start && page <= end;
        }
        return Number(ctx.page) === page;
      })?.text || "No context available"
    );
  };

  return (
    <div className="mt-6">
      <div className="mb-2 text-md flex items-center gap-2">
        <p className="text-blue-400">
          <SiBookstack />
        </p>
        <span className="text-zinc-300">References</span>
      </div>
      <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50 overflow-x-auto relative">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="text-left border-b border-zinc-700/50">
              <th className="pb-3 text-zinc-300">Document</th>
              <th className="pb-3 text-zinc-300">Pages</th>
            </tr>
          </thead>
          <tbody>
            {references.map((ref, index) => (
              <tr key={index} className="border-b border-zinc-700/30">
                <td className="py-3">
                  <div className="font-medium text-blue-400">
                    {ref.name || "Unnamed Document"}
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    {ref.page_numbers
                      ?.sort((a, b) => a - b)
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
