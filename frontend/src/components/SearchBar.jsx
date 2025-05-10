import React, { useRef, useEffect } from "react";
import { FaSpinner, FaPaperPlane } from "react-icons/fa";
import SpeechToText from "./SpeechToText";

function SearchBar({
  query,
  loading,
  onSubmit,
  onQueryChange,
  showSuggestions,
  filteredProducts,
  suggestionIndex,
  setSuggestionIndex,
  insertProduct,
  onTranscriptChange,
  setShowSuggestions,
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(Math.max(textareaRef.current.scrollHeight, 48), 96) + "px";
    }
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (showSuggestions && filteredProducts.length > 0) {
      e.preventDefault();
      insertProduct(filteredProducts[suggestionIndex], textareaRef.current);
      setShowSuggestions(false);
    } else {
      onSubmit(e);
    }
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && filteredProducts.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSuggestionIndex((prev) =>
            prev < filteredProducts.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : filteredProducts.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          insertProduct(filteredProducts[suggestionIndex], textareaRef.current);
          setShowSuggestions(false);
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          break;
        case "Tab":
          e.preventDefault();
          insertProduct(filteredProducts[suggestionIndex], textareaRef.current);
          setShowSuggestions(false);
          break;
        default:
          break;
      }
    } else if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const handleChange = (e) => {
    onQueryChange(e);
  };

  const handleProductClick = (product) => {
    insertProduct(product, textareaRef.current);
    setShowSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex mx-auto border -translate-y-20 border-blue-400/20 rounded-xl relative bg-zinc-900/50 backdrop-blur-sm shadow-lg shadow-blue-500/5 hover:shadow-blue-500/10 transition-all duration-300"
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
              : "Ask anything about compliance... (Use @ to mention products) Press Enter to submit, Ctrl+Enter for new line"
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
      {showSuggestions && filteredProducts.length > 0 && !loading && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-zinc-900/95 backdrop-blur-sm rounded-xl shadow-xl border border-blue-400/20 max-h-64 overflow-y-auto custom-scrollbar z-50">
          {filteredProducts.map((product, index) => (
            <div
              key={product.id}
              className={`p-3 hover:bg-zinc-800/50 cursor-pointer transition-all duration-300 ${
                index === suggestionIndex ? "bg-zinc-800/50" : ""
              }`}
              style={{
                borderLeft: `4px solid var(--${product.color}-500)`,
              }}
              onClick={() => handleProductClick(product)}
              onMouseEnter={() => setSuggestionIndex(index)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{
                    backgroundColor: `var(--${product.color}-500)`,
                  }}
                />
                <div className="font-medium text-blue-400">{product.title}</div>
              </div>
              <div className="text-xs text-zinc-400 truncate pl-4 mt-1">
                {product.info}
              </div>
            </div>
          ))}
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
          className={`p-2 bg-blue-500/10 hover:bg-blue-500/20 text-white rounded-lg transition-all duration-300 border border-blue-400/20 hover:border-blue-400/30 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? (
            <FaSpinner className="animate-spin w-5 h-5 text-blue-400" />
          ) : (
            <FaPaperPlane className="w-5 h-5 text-blue-400 hover:scale-110 transition-transform" />
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
  filteredProducts: [],
  suggestionIndex: -1,
  onSubmit: () => {},
  onQueryChange: () => {},
  setSuggestionIndex: () => {},
  insertProduct: () => {},
  onTranscriptChange: () => {},
  setShowSuggestions: () => {},
};

export default SearchBar;
