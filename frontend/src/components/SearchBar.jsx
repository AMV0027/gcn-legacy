import React, { useRef, useEffect, useState } from "react";
import { FaSpinner, FaPaperPlane, FaSearch } from "react-icons/fa";
import { BsDatabase } from "react-icons/bs";
import { BiSearch } from "react-icons/bi";
import { AiOutlineExperiment } from "react-icons/ai";
import SpeechToText from "./SpeechToText";
import { IoMdClose } from "react-icons/io";

function SearchBar({
  query = "",
  loading = false,
  onSubmit = () => {},
  onQueryChange = () => {},
  showSuggestions = false,
  pdfList = [],
  suggestionIndex = -1,
  setSuggestionIndex = () => {},
  onTranscriptChange = () => {},
  setShowSuggestions = () => {},
  settings = {
    useOnlineContext: false,
    useDatabase: true,
  },
  handleSettingsChange = () => {},
  chosenPdfs = [],
  setChosenPdfs = () => {},
}) {
  const textareaRef = useRef(null);
  const [pdfSearchTerm, setPdfSearchTerm] = useState("");
  const searchInputRef = useRef(null);
  const [translateY, setTranslateY] = useState(-20);

  const getCurrentMode = () => {
    if (settings.useOnlineContext && !settings.useDatabase) return "search";
    if (!settings.useOnlineContext && settings.useDatabase) return "research";
    if (settings.useOnlineContext && settings.useDatabase) return "deep";
    return "research"; // default
  };

  useEffect(() => {
    const adjustHeight = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "48px";
        const scrollHeight = textareaRef.current.scrollHeight;
        const newHeight = Math.min(Math.max(scrollHeight, 48), 96);
        textareaRef.current.style.height = newHeight + "px";
        setTranslateY(-20 - (newHeight - 48));
      }
    };

    const resizeObserver = new ResizeObserver(adjustHeight);
    if (textareaRef.current) resizeObserver.observe(textareaRef.current);
    adjustHeight();
    return () => {
      if (textareaRef.current) resizeObserver.unobserve(textareaRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleInput = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "48px";
        textareaRef.current.style.height =
          Math.min(Math.max(textareaRef.current.scrollHeight, 48), 96) + "px";
      }
    };
    const textarea = textareaRef.current;
    if (textarea) textarea.addEventListener("input", handleInput);
    return () => {
      if (textarea) textarea.removeEventListener("input", handleInput);
    };
  }, []);

  useEffect(() => {
    if (showSuggestions) {
      setPdfSearchTerm("");
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
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
      handlePdfInsert(filteredPdfs[suggestionIndex]);
      setShowSuggestions(false);
    } else {
      onSubmit(e);
    }
  };

  const handleKeyDown = (e) => {
    if (document.activeElement === searchInputRef.current) {
      if (e.key === "Enter" && filteredPdfs.length > 0) {
        e.preventDefault();
        handlePdfInsert(filteredPdfs[suggestionIndex]);
        setShowSuggestions(false);
      }
      if (e.key === "Escape") setShowSuggestions(false);
      if (e.key === "ArrowDown")
        setSuggestionIndex((prev) =>
          prev < Math.min(filteredPdfs.length - 1, 5) ? prev + 1 : 0
        );
      if (e.key === "ArrowUp")
        setSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : Math.min(filteredPdfs.length - 1, 5)
        );
      return;
    }

    if (showSuggestions && filteredPdfs.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          setSuggestionIndex((prev) =>
            prev < Math.min(filteredPdfs.length - 1, 5) ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          setSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : Math.min(filteredPdfs.length - 1, 5)
          );
          break;
        case "Enter":
        case "Tab":
          handlePdfInsert(filteredPdfs[suggestionIndex]);
          setShowSuggestions(false);
          break;
        case "Escape":
          setShowSuggestions(false);
          break;
        default:
          break;
      }
    } else if (e.key === "Enter" && e.ctrlKey) {
      onSubmit(e);
    } else if (e.key === "@") {
      setShowSuggestions(true);
      setSuggestionIndex(0);
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/@(\S*)$/);
    if (match) {
      setShowSuggestions(true);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
    onQueryChange(e);
  };

  const handlePdfClick = (pdf) => {
    handlePdfInsert(pdf);
    setShowSuggestions(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleModeSelect = (selectedMode) => {
    console.log("Mode selection clicked:", selectedMode);
    console.log("Current settings before change:", settings);

    let newSettings;
    switch (selectedMode) {
      case "search":
        newSettings = { useOnlineContext: true, useDatabase: false };
        break;
      case "research":
        newSettings = { useOnlineContext: false, useDatabase: true };
        break;
      case "deep":
        newSettings = { useOnlineContext: true, useDatabase: true };
        break;
      default:
        console.log("Invalid mode selected:", selectedMode);
        return;
    }

    console.log("New settings to be applied:", newSettings);
    handleSettingsChange(newSettings);
  };

  const removePdf = (pdfToRemove) => {
    // Remove from chosen PDFs list
    setChosenPdfs(chosenPdfs.filter((pdf) => pdf.name !== pdfToRemove.name));

    // Remove @pdfname from query text
    const pattern = new RegExp(`@${pdfToRemove.name}\\s*`, "g");
    const newQuery = query.replace(pattern, "");
    onQueryChange({ target: { value: newQuery } });
  };

  const handlePdfInsert = (pdf) => {
    if (!textareaRef.current) return;

    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = query.slice(0, cursorPosition);
    const textAfterCursor = query.slice(cursorPosition);

    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex === -1) return;

    // Get the text between @ and cursor
    const textAfterAt = textBeforeCursor.slice(lastAtIndex);
    const matchAfterAt = textAfterAt.match(/@(\S*)/);

    // Calculate where to end the replacement
    const replaceEnd = matchAfterAt
      ? cursorPosition - (textAfterAt.length - matchAfterAt[0].length)
      : cursorPosition;

    // Construct the new text
    const needsSpace =
      !textAfterCursor.startsWith(" ") && textAfterCursor.length > 0;
    const newText =
      textBeforeCursor.slice(0, lastAtIndex) +
      `@${pdf.name}` +
      (needsSpace ? " " : "") +
      textAfterCursor.slice(replaceEnd - cursorPosition);

    // Update the query
    onQueryChange({ target: { value: newText } });

    // Add to chosen PDFs if not already present
    if (!chosenPdfs.find((p) => p.name === pdf.name)) {
      setChosenPdfs([...chosenPdfs, pdf]);
    }

    // Calculate new cursor position
    const newCursorPosition =
      lastAtIndex + pdf.name.length + 1 + (needsSpace ? 1 : 0);

    // Focus and set cursor position
    requestAnimationFrame(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        newCursorPosition,
        newCursorPosition
      );
    });
  };

  // Add useEffect to log settings changes
  useEffect(() => {
    console.log("Settings updated in SearchBar:", settings);
    console.log("Current mode:", getCurrentMode());
  }, [settings]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6 -translate-y-12">
      {chosenPdfs.length > 0 && (
        <div
          className="flex flex-wrap gap-2 mb-3 -translate-y-4"
          style={{ transform: `translateY(${translateY}px)` }}
        >
          {chosenPdfs.map((pdf) => (
            <div
              key={pdf.name}
              className="flex items-center gap-1.5 bg-zinc-800/50 text-zinc-200 px-2 py-1 rounded-lg text-xs border border-zinc-700/30"
            >
              <span className="text-blue-400">{pdf.name}</span>
              <button
                type="button"
                onClick={() => removePdf(pdf)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <IoMdClose className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900/50 -translate-y-5 backdrop-blur-md shadow-md shadow-black/10 border border-zinc-700/30 rounded-2xl overflow-hidden flex items-end transition-all"
        style={{ transform: `translateY(${translateY}px)` }}
      >
        <div className="w-full flex flex-col justify-end">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={
              loading
                ? "Processing..."
                : "Ask anything... (Use @ to mention PDFs)"
            }
            className="flex-grow text-sm sm:text-base px-4 py-3 bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-24 min-h-[48px]"
          />
          <div
            className="flex gap-1 px-4 pb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleModeSelect("search");
              }}
              className={`border border-zinc-700/30 px-2 py-1 text-xs rounded-md transition-all duration-300 flex flex-row items-center ${
                getCurrentMode() === "search"
                  ? "bg-blue-500 text-white"
                  : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              <BiSearch className="inline-block mr-1" /> Search
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleModeSelect("research");
              }}
              className={`border border-zinc-700/30 px-2 py-1 text-xs rounded-md transition-all duration-300 flex flex-row items-center ${
                getCurrentMode() === "research"
                  ? "bg-blue-500 text-white"
                  : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              <BsDatabase className="inline-block mr-1" /> Research
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleModeSelect("deep");
              }}
              className={`border border-zinc-700/30 px-2 py-1 text-xs rounded-md transition-all duration-300 flex flex-row items-center ${
                getCurrentMode() === "deep"
                  ? "bg-blue-500 text-white"
                  : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              <AiOutlineExperiment className="inline-block mr-1" /> Deep
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 pr-2 pb-2 pl-2 border-l border-zinc-700/30">
          <SpeechToText
            onTranscriptChange={onTranscriptChange}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="p-2 rounded-md bg-blue-500/10 border border-blue-400/20 hover:bg-blue-500/20 text-white"
          >
            {loading ? (
              <FaSpinner className="animate-spin w-4 h-4" />
            ) : (
              <FaPaperPlane className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {showSuggestions && !loading && (
        <div
          style={{ transform: `translateY(${translateY}px)` }}
          className="-translate-y-24 absolute bottom-20 left-4 w-72 bg-zinc-900/90 rounded-xl shadow-lg border border-zinc-700 overflow-hidden z-50"
        >
          <div className="p-2 border-b border-zinc-700">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={pdfSearchTerm}
                onChange={(e) => setPdfSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search PDFs..."
                className="w-full bg-zinc-800 text-zinc-200 placeholder-zinc-500 text-sm pl-8 pr-4 py-2 rounded-lg focus:outline-none"
              />
              <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-sm" />
            </div>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {filteredPdfs.length > 0 ? (
              filteredPdfs.map((pdf, index) => (
                <div
                  key={pdf.name}
                  className={`p-3 cursor-pointer hover:bg-zinc-800 ${
                    index === suggestionIndex ? "bg-zinc-800" : ""
                  }`}
                  onClick={() => handlePdfClick(pdf)}
                  onMouseEnter={() => setSuggestionIndex(index)}
                >
                  <div className="font-medium text-blue-400">{pdf.name}</div>
                  {pdf.info && (
                    <div className="text-xs text-zinc-400 truncate mt-1">
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
    </div>
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
  onTranscriptChange: () => {},
  setShowSuggestions: () => {},
  settings: {
    useOnlineContext: false,
    useDatabase: true,
  },
  handleSettingsChange: () => {},
  chosenPdfs: [],
  setChosenPdfs: () => {},
};

export default SearchBar;
