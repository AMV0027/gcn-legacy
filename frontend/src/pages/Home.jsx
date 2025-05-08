import React, { useState, useRef, useEffect } from "react";
import {
  FaPaperPlane,
  FaSpinner,
  FaBook,
  FaFileAlt,
  FaTrash,
  FaCopy,
  FaPlus,
} from "react-icons/fa";
import { RiChatNewLine } from "react-icons/ri";
import StyledMarkdown from "../components/StyledMarkdown";
import logo from "../assets/wlogo.png";
import Image from "../components/Image";
import { BsGlobe2 } from "react-icons/bs";
import { AiOutlinePlus } from "react-icons/ai";
import SpeechToText from "../components/SpeechToText";
import TextToSpeech from "../components/TextToSpeech";
import { SiBookstack } from "react-icons/si";
import { RiMenu3Line } from "react-icons/ri";
import ProductModal from "../components/ProductModal";
import DocumentModal from "../components/DocumentModal";
import RelevantDefaultQueries from "../components/RelevantDefaultQueries";

const Home = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [recentQueries, setRecentQueries] = useState([]);
  const [showVideos, setShowVideos] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const inputRef = useRef(null);
  const [chatTab, setChatTab] = useState(false);
  const [url, setUrl] = useState("");
  const [metadata, setMetadata] = useState({});
  const [text, setText] = useState("");
  const [chatName, setChatName] = useState("New Chat");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const textareaRef = useRef(null);
  const [error, setError] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const [randomQueries, setRandomQueries] = useState([]);

  const handleFetch = async () => {
    const data = await fetchMetadata(url);
    setMetadata(data);
  };

  useEffect(() => {
    const savedQueries = JSON.parse(
      localStorage.getItem("recentQueries") || "[]"
    );
    setRecentQueries(savedQueries);
    fetchChatList();
  }, []);

  useEffect(() => {
    const fetchMetadataWithDelay = async (link, index) => {
      // Add delay based on index to prevent rate limiting
      await new Promise((resolve) => setTimeout(resolve, index * 1000));
      if (!metadata[link]) {
        await fetchMetadata(link);
      }
    };

    chatMessages.forEach((msg) => {
      if (msg.online_links) {
        msg.online_links.forEach((link, index) => {
          fetchMetadataWithDelay(link, index);
        });
      }
    });
  }, [chatMessages]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/products");
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchRandomQueries = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/random-product-queries"
        );
        if (response.ok) {
          const data = await response.json();
          setRandomQueries(data.queries || []);
        }
      } catch (error) {
        console.error("Error fetching random queries:", error);
      }
    };

    fetchRandomQueries();
  }, []);

  const fetchChatList = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/chat-list");
      if (!response.ok) throw new Error("Failed to fetch chat list");
      const data = await response.json();
      setChatList(data);
      return data;
    } catch (error) {
      console.error("Error fetching chat list:", error);
      return null;
    }
  };

  const deleteChat = async (chatId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/chat?chatId=${encodeURIComponent(chatId)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete chat");
      }

      // Update local state immediately
      setChatList((prevList) =>
        prevList.filter((chat) => chat.chat_id !== chatId)
      );

      // If we're deleting the currently selected chat
      if (selectedChat?.chat_id === chatId) {
        setSelectedChat(null);
        setChatMessages([]);
        setResults(null);
        setChatName("New Chat");

        // Try to select the next available chat
        const remainingChats = await fetchChatList();
        if (remainingChats?.length > 0) {
          await selectChat(remainingChats[0]);
        }
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      // Refresh the chat list to ensure UI is in sync with server
      fetchChatList();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("http://localhost:5000/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          org_query: query,
          chat_id: selectedChat?.chat_id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      // Update chat messages
      setChatMessages((prev) => [
        ...prev,
        {
          query: query,
          answer: data.answer,
          pdf_references: data.pdf_references || [],
          online_images: data.online_images || [],
          online_videos: data.online_videos || [],
          online_links: data.online_links || [],
          relevant_queries: data.related_queries || [],
        },
      ]);

      // Update chat name and refresh chat list if this is a new chat
      if (data.chat_name && !selectedChat) {
        setChatName(data.chat_name);
        // Refresh chat list to get the updated name
        const updatedChatList = await fetchChatList();
        // Select the new chat
        const newChat = updatedChatList.find(
          (chat) => chat.chat_id === data.chatId
        );
        if (newChat) {
          setSelectedChat(newChat);
        }
      }

      setQuery("");
    } catch (error) {
      console.error("Request error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectChat = async (chat) => {
    setSelectedChat(chat);
    setResults({
      query: chat.query,
      answer: chat.answer,
      pdf_references: chat.pdf_references,
      similar_images: chat.similar_images,
      online_images: chat.online_images,
      online_videos: chat.online_videos,
      relevant_queries: chat.relevant_queries,
    });
    await fetchChatHistory(chat.chat_id);
  };

  const fetchChatHistory = async (chatId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/chat-history/${chatId}`
      );
      if (!response.ok) throw new Error("Failed to fetch chat history");
      const messages = await response.json();
      setChatMessages(messages);
      if (messages.length > 0) {
        setResults(messages[messages.length - 1]);
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  };

  const fetchMetadata = async (url) => {
    try {
      // First try using a CORS proxy
      const proxyUrls = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://cors-anywhere.herokuapp.com/${url}`,
        `https://proxy.cors.sh/${url}`,
      ];

      for (const proxyUrl of proxyUrls) {
        try {
          const response = await fetch(proxyUrl, {
            headers: {
              "x-requested-with": "XMLHttpRequest",
            },
          });

          if (!response.ok) {
            if (response.status === 429) {
              // Too Many Requests
              continue; // Try next proxy
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          let text;
          if (proxyUrl.includes("allorigins")) {
            const json = await response.json();
            text = json.contents;
          } else {
            text = await response.text();
          }

          const doc = new DOMParser().parseFromString(text, "text/html");

          const metadata = {
            title:
              doc.querySelector("title")?.innerText ||
              doc.querySelector('meta[property="og:title"]')?.content ||
              "Unknown Title",
            description:
              doc.querySelector('meta[name="description"]')?.content ||
              doc.querySelector('meta[property="og:description"]')?.content ||
              "No description available",
            image:
              doc.querySelector('meta[property="og:image"]')?.content || null,
          };

          // Cache the metadata
          setMetadata((prev) => ({
            ...prev,
            [url]: metadata,
          }));

          return metadata;
        } catch (proxyError) {
          console.warn(`Proxy ${proxyUrl} failed:`, proxyError);
          continue; // Try next proxy
        }
      }

      // If all proxies fail, try direct fetch with no-cors mode
      const response = await fetch(url, {
        mode: "no-cors",
        headers: {
          Accept: "text/html",
        },
      });

      // With no-cors, we can only get limited metadata
      const fallbackMetadata = {
        title: new URL(url).hostname,
        description: "Content not accessible due to CORS restrictions",
        image: null,
      };

      setMetadata((prev) => ({
        ...prev,
        [url]: fallbackMetadata,
      }));

      return fallbackMetadata;
    } catch (error) {
      console.error("Error fetching metadata for", url, error);
      // Return basic metadata from URL
      const fallback = {
        title: new URL(url).hostname,
        description: "Unable to fetch content",
        image: null,
      };
      setMetadata((prev) => ({
        ...prev,
        [url]: fallback,
      }));
      return fallback;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log("Text copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  const handleTranscriptChange = (newTranscript) => {
    setQuery(newTranscript);
    inputRef.current.value = newTranscript;
  };

  const handleQueryChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);

    // Adjust textarea height
    e.target.style.height = "auto";
    e.target.style.height =
      Math.min(Math.max(e.target.scrollHeight, 48), 96) + "px";

    // Handle @ mentions with improved detection
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/@([^\s]*)$/); // Updated regex pattern

    if (match && products.length > 0) {
      // Added products length check
      const searchTerm = match[1].toLowerCase();
      const filtered = products.filter((p) =>
        p.title.toLowerCase().includes(searchTerm)
      );
      setFilteredProducts(filtered);
      setShowSuggestions(true);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSuggestionIndex((prev) =>
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        if (showSuggestions && filteredProducts.length > 0) {
          e.preventDefault();
          insertProduct(filteredProducts[suggestionIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
      case "@":
        // Show all products when @ is typed
        setFilteredProducts(products);
        setShowSuggestions(true);
        setSuggestionIndex(0);
        break;
      default:
        break;
    }
  };

  const insertProduct = (product) => {
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = query.slice(0, cursorPosition);
    const textAfterCursor = query.slice(cursorPosition);
    const lastAtSign = textBeforeCursor.lastIndexOf("@");

    const newText =
      textBeforeCursor.slice(0, lastAtSign) +
      `@${product.title} ` +
      textAfterCursor;

    setQuery(newText);
    setShowSuggestions(false);

    // Focus back on textarea and move cursor to end of inserted text
    textareaRef.current.focus();
    const newCursorPosition = lastAtSign + product.title.length + 2; // +2 for @ and space
    setTimeout(() => {
      textareaRef.current.setSelectionRange(
        newCursorPosition,
        newCursorPosition
      );
    }, 0);
  };

  const handleImageLoad = (imageUrl) => {
    setLoadedImages((prev) => ({
      ...prev,
      [imageUrl]: true,
    }));
  };

  const handleImageError = (imageUrl) => {
    setImageErrors((prev) => ({
      ...prev,
      [imageUrl]: true,
    }));
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-zinc-950 to-zinc-900 text-white">
      <header className="bg-zinc-900/50 backdrop-blur-sm border-b border-blue-400/20 shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Logo"
              className="h-10 sm:h-12 hover:scale-105 transition-transform duration-300"
            />
            <p className="text-xl sm:text-2xl font-poppins font-semibold bg-gradient-to-tr from-blue-400 via-sky-400 to-blue-600 bg-clip-text text-transparent">
              GCN
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end">
            <button
              onClick={() => setIsDocumentModalOpen(true)}
              className="flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-700/50 p-2 pl-3 pr-3 sm:pl-4 sm:pr-4 rounded-lg border border-zinc-700/50 hover:border-blue-400/30 transition-all duration-300 group flex-1 sm:flex-none justify-center"
            >
              <FaFileAlt
                size={16}
                className="text-blue-400 group-hover:scale-110 transition-transform"
              />
              <span className="text-zinc-300 group-hover:text-blue-400 text-sm sm:text-base">
                Manage Documents
              </span>
            </button>
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-700/50 p-2 pl-3 pr-3 sm:pl-4 sm:pr-4 rounded-lg border border-zinc-700/50 hover:border-blue-400/30 transition-all duration-300 group flex-1 sm:flex-none justify-center"
            >
              <FaBook
                size={16}
                className="text-blue-400 group-hover:scale-110 transition-transform"
              />
              <span className="text-zinc-300 group-hover:text-blue-400 text-sm sm:text-base">
                Add Product
              </span>
            </button>
          </div>
        </div>
      </header>

      <button
        onClick={() => setChatTab(!chatTab)}
        className="flex items-center gap-2 ml-4 bg-zinc-900/50 hover:bg-zinc-800/50 p-2 absolute z-30 rounded-lg translate-y-6 backdrop-blur-sm border border-zinc-800/50 hover:border-blue-400/30 transition-all duration-300"
      >
        <RiMenu3Line className="text-blue-400" />
      </button>
      <a
        href="/home"
        className="flex items-center gap-2 ml-4 bg-zinc-900/50 hover:bg-zinc-800/50 p-2 absolute z-30 rounded-lg translate-x-12 translate-y-6 backdrop-blur-sm border border-zinc-800/50 hover:border-blue-400/30 transition-all duration-300"
      >
        <RiChatNewLine className="text-blue-400" />
      </a>
      <div className="flex flex-row">
        <aside
          className={`${
            chatTab
              ? "w-full sm:w-[300px] md:w-[350px] opacity-100 translate-x-0"
              : "w-0 opacity-0 translate-x-[-100%]"
          } bg-zinc-900/50 backdrop-blur-sm overflow-clip border-r border-zinc-800/50 text-white transition-all duration-700 ease-in-out fixed sm:relative z-20 h-[calc(100vh-64px)]`}
        >
          <div className="h-full pt-18 p-4 overflow-y-auto flex flex-col gap-3">
            {chatList.map((chat) => (
              <div
                key={chat.chat_id}
                className={`w-full flex justify-between text-left bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-blue-400/30 p-3 rounded-lg transition-all duration-300 ${
                  selectedChat?.chat_id === chat.chat_id
                    ? "bg-blue-500/10 border-blue-400/30"
                    : ""
                }`}
              >
                <button
                  className="flex-1 text-left flex items-center justify-between w-full"
                  onClick={() => selectChat(chat)}
                >
                  <div className="flex gap-1">
                    {chat.product_colors &&
                      chat.product_colors.map((product, idx) => (
                        <div
                          key={`${chat.chat_id}-${product.id}-${idx}`}
                          className={`w-2 h-2 rounded-full bg-${product.color}-500 animate-pulse`}
                        />
                      ))}
                  </div>
                  <div className="font-normal overflow-clip font-poppins text-zinc-300 truncate flex-1 mx-2">
                    {chat.name.slice(0, 25).replace(`"`, ``) + "..." ||
                      "New Chat"}
                  </div>
                </button>
                <button
                  onClick={() => deleteChat(chat.chat_id)}
                  className="text-blue-400 ml-3 hover:text-red-300 transition-colors duration-300"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        </aside>
        <main className="flex-grow pb-6 py-5 flex flex-col items-center">
          <div className="w-full max-w-6xl mb-8 rounded-lg px-4 sm:px-6">
            <div className="p-2 sm:p-4">
              <div className="h-[calc(100vh-180px)] sm:h-[75vh] overflow-y-auto custom-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col justify-center items-center h-full font-poppins">
                    <div className="flex flex-col sm:flex-row gap-2 items-center select-none animate-fade-in">
                      <img
                        src={logo || "/placeholder.svg"}
                        className="h-32 sm:h-40 select-none hover:scale-105 transition-transform duration-300"
                        alt="GCN Logo"
                      />
                      <p className="text-6xl sm:text-8xl font-semibold font-unbound bg-gradient-to-tr from-blue-600 via-sky-400 to-blue-600 bg-clip-text text-transparent">
                        GCN
                      </p>
                    </div>
                    <p className="relative -top-6 text-xl sm:text-2xl text-zinc-400">
                      Global Compliance Navigator
                    </p>
                    <h2 className="text-2xl sm:text-4xl font-thin text-zinc-500 text-center mt-2">
                      What do you want to know about compliance?
                    </h2>

                    <RelevantDefaultQueries onQuerySelect={setQuery} />
                  </div>
                ) : (
                  <div className="space-y-8">
                    {chatMessages.map((msg, index) => (
                      <div
                        key={index}
                        className="flex w-full font-raleway flex-col sm:flex-row justify-between mb-4 border-b border-zinc-800/50 pb-8 animate-fade-in"
                      >
                        <div className="h-full w-full sm:w-3/4">
                          <h1 className="text-2xl sm:text-3xl font-normal mb-4 mt-4 font-poppins text-zinc-200">
                            {msg.query}
                          </h1>
                          <div className="mb-2 rounded-t-2xl text-lg sm:text-xl mt-2 flex justify-start items-center gap-2">
                            <p className="text-blue-400 text-md animate-pulse">
                              <BsGlobe2 />
                            </p>
                            <span className="text-zinc-300">Answer</span>
                          </div>
                          <div className="w-full mt-2 mb-3 overflow-x-auto flex flex-row justify-start gap-2 rounded-lg pb-2">
                            {msg.online_links.map((link, index) => {
                              const meta = metadata[link] || {
                                title: "Loading...",
                                description: "",
                                image: null,
                              };
                              const truncatedTitle =
                                meta.title.length > 15
                                  ? `${meta.title.slice(0, 15)}...`
                                  : meta.title;

                              const domain = new URL(link).hostname;
                              const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

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
                                        e.target.nextSibling.style.display =
                                          "flex";
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

                          <div className="bg-zinc-800/50 rounded-lg p-4 sm:p-6 border border-zinc-700/50">
                            <StyledMarkdown content={msg.answer} />
                          </div>

                          <div className="flex flex-row justify-end gap-3 items-center mt-4">
                            <TextToSpeech text={msg.answer} />
                            <button
                              onClick={() => copyToClipboard(msg.answer)}
                              className="text-zinc-400 hover:text-blue-400 transition-colors duration-300"
                            >
                              <FaCopy />
                            </button>
                          </div>

                          {msg?.pdf_references &&
                            Array.isArray(msg.pdf_references) &&
                            msg.pdf_references.length > 0 && (
                              <div className="mt-6">
                                <div className="mb-2 text-md flex items-center gap-2">
                                  <p className="text-blue-400">
                                    <SiBookstack />
                                  </p>
                                  <span className="text-zinc-300">
                                    References
                                  </span>
                                </div>
                                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50 overflow-x-auto">
                                  <table className="w-full min-w-[500px]">
                                    <thead>
                                      <tr className="text-left border-b border-zinc-700/50">
                                        <th className="pb-3 text-zinc-300">
                                          Document
                                        </th>
                                        <th className="pb-3 text-zinc-300">
                                          Pages
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {msg.pdf_references.map((ref, index) => (
                                        <tr
                                          key={index}
                                          className="border-b border-zinc-700/30"
                                        >
                                          <td className="py-3">
                                            <div className="font-medium text-blue-400">
                                              {ref.name || "Unnamed Document"}
                                            </div>
                                          </td>
                                          <td className="py-3">
                                            <div className="flex flex-wrap gap-2">
                                              {ref.page_number
                                                ?.sort((a, b) => a - b)
                                                .map((page) => (
                                                  <a
                                                    key={page}
                                                    href={`http://localhost:5000/api/pdf?name=${encodeURIComponent(
                                                      ref.name
                                                    )}#page=${page}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1 bg-zinc-700/50 hover:bg-blue-500/20 rounded-md hover:text-blue-400 transition-all duration-300 cursor-pointer border border-zinc-600/50 hover:border-blue-400/30"
                                                  >
                                                    {page}
                                                  </a>
                                                ))}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                          <div className="mt-8 w-full">
                            {msg.relevant_queries.length > 0 && (
                              <div className="mb-2 text-md flex items-center gap-2">
                                <p className="text-blue-400">
                                  <SiBookstack />
                                </p>
                                <span className="text-zinc-300">Related</span>
                              </div>
                            )}
                            <div className="border-b border-zinc-700/50 w-full">
                              {msg.relevant_queries.map((item, index) => (
                                <button
                                  key={index}
                                  onClick={() => setQuery(item)}
                                  className="w-full flex flex-between items-center pt-3 pb-3 border-t border-zinc-700/30 hover:text-blue-400 transition-colors duration-300"
                                >
                                  <p className="text-left w-full text-zinc-300 text-sm sm:text-base">
                                    {item}
                                  </p>
                                  <AiOutlinePlus className="text-blue-400" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="w-full sm:w-1/4 p-3 gap-3 flex flex-col justify-start mt-4 sm:mt-0">
                          <button
                            onClick={() => setShowImages(!showImages)}
                            className="border text-sm flex items-center justify-center gap-2 hover:text-blue-400 hover:border-blue-400/30 border-zinc-700/50 text-poppins rounded-lg p-2 transition-all duration-300 bg-zinc-800/50 hover:bg-zinc-700/50"
                          >
                            Search Images <FaPlus className="text-blue-400" />
                          </button>
                          <div>
                            {showImages &&
                              msg.online_images &&
                              msg.online_images.length > 0 && (
                                <div
                                  className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${
                                    showImages ? "opacity-100" : "opacity-0"
                                  } transition-all duration-500 ease-in-out`}
                                >
                                  {msg.online_images.map((img, index) => {
                                    if (imageErrors[img]) return null;

                                    return (
                                      <div
                                        key={index}
                                        className="relative aspect-video"
                                      >
                                        {!loadedImages[img] && (
                                          <div className="absolute inset-0 bg-zinc-800/50 flex items-center justify-center rounded-lg">
                                            <FaSpinner className="animate-spin text-blue-400" />
                                          </div>
                                        )}
                                        <Image
                                          src={img}
                                          alt={`Online image ${index + 1}`}
                                          className={`w-full h-full object-cover rounded-lg transition-opacity duration-300 ${
                                            loadedImages[img]
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                          onLoad={() => handleImageLoad(img)}
                                          onError={() => handleImageError(img)}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                          </div>

                          <button
                            onClick={() => setShowVideos(!showVideos)}
                            className="border text-sm flex items-center justify-center gap-2 hover:text-blue-400 hover:border-blue-400/30 border-zinc-700/50 text-poppins rounded-lg p-2 transition-all duration-300 bg-zinc-800/50 hover:bg-zinc-700/50"
                          >
                            Search Videos <FaPlus className="text-blue-400" />
                          </button>

                          <div className="flex flex-col gap-3">
                            {showVideos &&
                              msg.online_videos.map((video, index) => (
                                <div
                                  key={index}
                                  className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden border border-zinc-700/50"
                                >
                                  <iframe
                                    src={`https://www.youtube-nocookie.com/embed/${video}?modestbranding=1&rel=0&showinfo=0&controls=1`}
                                    className="w-full rounded-lg"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    referrerPolicy="strict-origin-when-cross-origin"
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex mx-auto border border-blue-400/20 rounded-xl relative bg-zinc-900/50 backdrop-blur-sm shadow-lg shadow-blue-500/5 hover:shadow-blue-500/10 transition-all duration-300 -translate-y-12 relative"
            >
              <div className="flex-grow flex items-center px-4 py-2">
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  placeholder={
                    loading
                      ? "Processing your query..."
                      : "Ask anything about compliance... (Use @ to mention products)"
                  }
                  className={`w-full bg-transparent focus:outline-none focus:ring-0 min-h-[48px] max-h-[48px] resize-none text-zinc-200 placeholder-zinc-500 text-sm sm:text-base leading-relaxed ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  rows={1}
                  style={{
                    height: "48px",
                    lineHeight: "48px",
                    padding: "0",
                  }}
                />
              </div>

              {showSuggestions && filteredProducts.length > 0 && !loading && (
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-zinc-900/95 backdrop-blur-sm rounded-xl shadow-xl border border-blue-400/20 max-h-64 overflow-y-auto custom-scrollbar">
                  {filteredProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className={`p-3 hover:bg-zinc-800/50 cursor-pointer transition-all duration-300 ${
                        index === suggestionIndex ? "bg-zinc-800/50" : ""
                      }`}
                      style={{
                        borderLeft: `4px solid var(--${product.color}-500)`,
                      }}
                      onClick={() => insertProduct(product)}
                      onMouseEnter={() => setSuggestionIndex(index)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full animate-pulse"
                          style={{
                            backgroundColor: `var(--${product.color}-500)`,
                          }}
                        />
                        <div className="font-medium text-blue-400">
                          {product.title}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-400 truncate pl-4 mt-1">
                        {product.info}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1 pr-2">
                <SpeechToText
                  onTranscriptChange={handleTranscriptChange}
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
          </div>
        </main>
      </div>
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onProductSelect={(product) => {
          setQuery((prev) => prev + ` @${product.title} `);
          setIsProductModalOpen(false);
        }}
      />
      <DocumentModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
      />
    </div>
  );
};

export default Home;
