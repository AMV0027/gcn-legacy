import React, { useRef, useEffect, useState } from "react";
import { FaSpinner, FaPaperPlane, FaSearch } from "react-icons/fa";
import SpeechToText from "./SpeechToText";

function SearchBar({
  query,
  loading,
  onSubmit,
  onQueryChange,
  showSuggestions,
  pdfList,
  suggestionIndex,
  setSuggestionIndex,
  insertPdf,
  onTranscriptChange,
  setShowSuggestions,
}) {
  const textareaRef = useRef(null);
  const [pdfSearchTerm, setPdfSearchTerm] = useState("");
  const searchInputRef = useRef(null);
  const [translateY, setTranslateY] = useState(-20);

  useEffect(() => {
    const adjustHeight = () => {
      if (textareaRef.current) {
        // Reset height temporarily to get the correct scrollHeight
        textareaRef.current.style.height = "48px";
        const scrollHeight = textareaRef.current.scrollHeight;
        const newHeight = Math.min(Math.max(scrollHeight, 48), 96);
        textareaRef.current.style.height = newHeight + "px";

        // Calculate additional translation based on height increase
        const heightIncrease = newHeight - 48; // 48px is base height
        setTranslateY(-20 - heightIncrease); // Start at -20 and move up by the increase in height
      }
    };

    // Create a ResizeObserver to handle content changes
    const resizeObserver = new ResizeObserver(adjustHeight);
    if (textareaRef.current) {
      resizeObserver.observe(textareaRef.current);
    }

    // Initial height adjustment
    adjustHeight();

    // Cleanup
    return () => {
      if (textareaRef.current) {
        resizeObserver.unobserve(textareaRef.current);
      }
    };
  }, [query]);

  // Add an additional effect to handle dynamic content changes
  useEffect(() => {
    const handleInput = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "48px";
        textareaRef.current.style.height =
          Math.min(Math.max(textareaRef.current.scrollHeight, 48), 96) + "px";
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("input", handleInput);
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener("input", handleInput);
      }
    };
  }, []);

  useEffect(() => {
    // Reset search term when suggestions are shown/hidden
    if (showSuggestions) {
      setPdfSearchTerm("");
      // Focus the search input when suggestions are shown
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  }, [showSuggestions]);

  const filteredPdfs = pdfList
    .filter(
      (pdf) =>
        pdf.name.toLowerCase().includes(pdfSearchTerm.toLowerCase()) ||
        (pdf.info &&
          pdf.info.toLowerCase().includes(pdfSearchTerm.toLowerCase()))
    )
    .slice(0, 6);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (showSuggestions && filteredPdfs.length > 0) {
      e.preventDefault();
      insertPdf(filteredPdfs[suggestionIndex], textareaRef.current);
      setShowSuggestions(false);
    } else {
      onSubmit(e);
    }
  };

  const handleKeyDown = (e) => {
    // Don't handle navigation keys if the search input is focused
    if (document.activeElement === searchInputRef.current) {
      if (e.key === "Enter" && filteredPdfs.length > 0) {
        e.preventDefault();
        insertPdf(filteredPdfs[suggestionIndex], textareaRef.current);
        setShowSuggestions(false);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIndex((prev) =>
          prev < Math.min(filteredPdfs.length - 1, 5) ? prev + 1 : 0
        );
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : Math.min(filteredPdfs.length - 1, 5)
        );
      }
      return;
    }

    if (showSuggestions && filteredPdfs.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSuggestionIndex((prev) =>
            prev < Math.min(filteredPdfs.length - 1, 5) ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : Math.min(filteredPdfs.length - 1, 5)
          );
          break;
        case "Enter":
          e.preventDefault();
          insertPdf(filteredPdfs[suggestionIndex], textareaRef.current);
          setShowSuggestions(false);
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          break;
        case "Tab":
          e.preventDefault();
          insertPdf(filteredPdfs[suggestionIndex], textareaRef.current);
          setShowSuggestions(false);
          break;
        default:
          break;
      }
    } else if (e.key === "Enter") {
      if (e.ctrlKey) {
        e.preventDefault();
        onSubmit(e);
      }
      // Let the default Enter behavior create a new line
    } else if (e.key === "@") {
      setShowSuggestions(true);
      setSuggestionIndex(0);
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/@([^\s]*)$/);

    if (match) {
      setShowSuggestions(true);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }

    onQueryChange(e);
  };

  const handlePdfClick = (pdf) => {
    insertPdf(pdf, textareaRef.current);
    setShowSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        transform: `translateY(${translateY}px)`,
        transition: "transform 0.2s ease-out",
      }}
      className="flex mx-auto border border-blue-400/20 rounded-xl relative bg-zinc-900/50 backdrop-blur-sm shadow-lg shadow-blue-500/5 hover:shadow-blue-500/10 transition-all duration-700"
    >
      <div className="flex-grow flex items-end px-4 py-2">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder={
            loading
              ? "Processing your query..."
              : "Ask anything about compliance... (Use @ to mention PDFs)"
          }
          className={`w-full bg-transparent focus:outline-none focus:ring-0 min-h-[48px] max-h-[96px] resize-none text-zinc-200 placeholder-zinc-500 text-sm sm:text-base leading-normal py-3 align-bottom ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          style={{
            transform: "translateY(0)",
            bottom: 0,
            verticalAlign: "bottom",
          }}
          rows={1}
        />
      </div>
      {showSuggestions && !loading && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-zinc-900/95 backdrop-blur-sm rounded-xl shadow-xl border border-blue-400/20 overflow-hidden z-50">
          <div className="p-2 border-b border-zinc-800/50">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={pdfSearchTerm}
                onChange={(e) => setPdfSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search PDFs..."
                className="w-full bg-zinc-800/50 text-zinc-200 placeholder-zinc-500 text-sm rounded-lg pl-8 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
              />
              <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-sm" />
            </div>
          </div>
          <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
            {filteredPdfs.length > 0 ? (
              filteredPdfs.map((pdf, index) => (
                <div
                  key={pdf.name}
                  className={`p-3 hover:bg-zinc-800/50 cursor-pointer transition-all duration-300 ${
                    index === suggestionIndex ? "bg-zinc-800/50" : ""
                  }`}
                  onClick={() => handlePdfClick(pdf)}
                  onMouseEnter={() => setSuggestionIndex(index)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <div className="font-medium text-blue-400">{pdf.name}</div>
                  </div>
                  {pdf.info && (
                    <div className="text-xs text-zinc-400 truncate pl-4 mt-1">
                      {pdf.info}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 text-zinc-500 text-center">No PDFs found</div>
            )}
          </div>
        </div>
      )}
      <div className="flex items-end gap-1 pr-2 pb-2">
        <SpeechToText
          onTranscriptChange={onTranscriptChange}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className={`group relative p-2 bg-blue-500/10 hover:bg-blue-500/20 text-white rounded-lg transition-all duration-300 border border-blue-400/20 hover:border-blue-400/30 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? (
            <FaSpinner className="animate-spin w-5 h-5 text-blue-400" />
          ) : (
            <>
              <FaPaperPlane className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-8 right-0 hidden group-hover:block bg-zinc-800 text-xs text-zinc-200 px-2 py-1 rounded whitespace-nowrap">
                Press Ctrl+Enter to send
              </span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

SearchBar.defaultProps = {
  query: "",
  loading: false,
  showSuggestions: false,
  pdfList: [],
  suggestionIndex: -1,
  onSubmit: () => {},
  onQueryChange: () => {},
  setSuggestionIndex: () => {},
  insertPdf: () => {},
  onTranscriptChange: () => {},
  setShowSuggestions: () => {},
};

export default SearchBar;
