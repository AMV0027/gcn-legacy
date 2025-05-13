import React, { useState, useRef, useEffect } from "react";
import { FaCopy } from "react-icons/fa";
import { RiChatNewLine } from "react-icons/ri";
import StyledMarkdown from "../components/StyledMarkdown";
import { BsGlobe2, BsDatabase } from "react-icons/bs";
import TextToSpeech from "../components/TextToSpeech";
import { RiMenu3Line } from "react-icons/ri";
import ProductModal from "../components/ProductModal";
import DocumentModal from "../components/DocumentModal";
import RelevantQueries from "../components/RelevantQueries";
import SearchBar from "../components/SearchBar";
import OnlineImages from "../components/OnlineImages";
import OnlineVideos from "../components/OnlineVideos";
import PdfReferences from "../components/PdfReferences";
import OnlineSources from "../components/OnlineSources";
import HeroSection from "../components/HeroSection";
import AsideChatHistory from "../components/AsideChatHistory";
import Header from "../components/Header";
import { QueryResultSkeleton } from "../components/AnswerSkeleton";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [recentQueries, setRecentQueries] = useState([]);
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
  const [imageErrors, setImageErrors] = useState({});
  const [pdfList, setPdfList] = useState([]);
  const [chosenPdfs, setChosenPdfs] = useState([]);
  const [settings, setSettings] = useState({
    useOnlineContext: false,
    useDatabase: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    const savedQueries = JSON.parse(
      localStorage.getItem("recentQueries") || "[]"
    );
    setRecentQueries(savedQueries);
    fetchChatList();
    fetchPdfList();
  }, [navigate]);

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

  const fetchPdfList = async (searchTerm = "") => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/search-pdfs${
          searchTerm ? `?search_query=${searchTerm}` : ""
        }`
      );
      setPdfList(response.data.results || []);
    } catch (error) {
      console.error("Error fetching PDFs:", error);
      setPdfList([]);
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

  const handleSettingsChange = (newSettings) => {
    console.log("Settings change requested in Home:", newSettings);
    setSettings(newSettings);
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

      console.log("Submitting query with settings:", settings);
      console.log(
        "Chosen PDFs:",
        chosenPdfs.map((pdf) => pdf.name)
      );

      // Scroll to the bottom to show the loading skeleton
      setTimeout(() => {
        const chatContainer = document.querySelector(".custom-scrollbar");
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);

      const payload = {
        query: query,
        org_query: query,
        chat_id: selectedChat?.chat_id || null,
        settings: {
          useOnlineContext: settings.useOnlineContext,
          useDatabase: settings.useDatabase,
        },
        chosen_pdfs: chosenPdfs.map((pdf) => pdf.name),
      };

      console.log("Request payload:", payload);

      const response = await fetch("http://localhost:5000/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Response data:", data);

      // Update chat messages
      setChatMessages((prev) => {
        const newMessages = [
          ...prev,
          {
            query: query,
            answer: data.answer,
            pdf_references: data.pdf_references || [],
            online_images: data.online_images || [],
            online_videos: data.online_videos || [],
            online_links: data.online_links || [],
            relevant_queries: data.related_queries || [],
            status: data.settings,
          },
        ];
        console.log("Updated chat messages:", newMessages);
        return newMessages;
      });

      // Reset chosen PDFs after submission
      setChosenPdfs([]);

      // Update chat name and refresh chat list if this is a new chat
      if (data.chat_name && !selectedChat) {
        setChatName(data.chat_name);
        const updatedChatList = await fetchChatList();
        const newChat = updatedChatList.find(
          (chat) => chat.chat_id === data.chatId
        );
        if (newChat) {
          setSelectedChat(newChat);
          console.log("Selected new chat:", newChat);
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
      status: chat.settings || {
        useDatabase: true,
        useOnlineContext: true,
      },
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

      // Ensure each message has a status field with default values
      const processedMessages = messages.map((msg) => ({
        ...msg,
        status: msg.settings || {
          useDatabase: true,
          useOnlineContext: true,
        },
      }));

      setChatMessages(processedMessages);
      if (processedMessages.length > 0) {
        const lastMessage = processedMessages[processedMessages.length - 1];
        setResults({
          ...lastMessage,
          status: lastMessage.settings || {
            useDatabase: true,
            useOnlineContext: true,
          },
        });
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

    // Handle @ mentions for PDFs
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/@([^\s]*)$/);

    if (match) {
      const searchTerm = match[1];
      fetchPdfList(searchTerm);
      setShowSuggestions(true);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) {
      // Submit on Enter (without Shift/Cmd)
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey) {
        e.preventDefault();
        handleSubmit(e);
      }
      // Allow new line on Shift+Enter or Cmd+Enter
      // (no need to handle explicitly, just let default happen)
      return;
    }

    // Handle suggestions navigation
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
        if (filteredProducts.length > 0) {
          e.preventDefault();
          insertProduct(filteredProducts[suggestionIndex], textareaRef.current);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
      case "@":
        setFilteredProducts(products);
        setShowSuggestions(true);
        setSuggestionIndex(0);
        break;
      default:
        break;
    }
  };

  const insertProduct = (product, textareaElement) => {
    if (!textareaElement) return;

    const cursorPosition = textareaElement.selectionStart;
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
      `@${product.title}` +
      (needsSpace ? " " : "") +
      textAfterCursor.slice(replaceEnd - cursorPosition);

    // Update the query
    setQuery(newText);

    // Calculate new cursor position
    const newCursorPosition =
      lastAtIndex + product.title.length + 1 + (needsSpace ? 1 : 0);

    // Focus and set cursor position
    requestAnimationFrame(() => {
      textareaElement.focus();
      textareaElement.setSelectionRange(newCursorPosition, newCursorPosition);
    });
  };

  const insertPdf = (pdf, textareaElement) => {
    if (!textareaElement) return;

    const cursorPosition = textareaElement.selectionStart;
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
    setQuery(newText);

    // Add to chosen PDFs if not already present
    setChosenPdfs((prev) => {
      if (!prev.find((p) => p.name === pdf.name)) {
        return [...prev, pdf];
      }
      return prev;
    });

    // Calculate new cursor position
    const newCursorPosition =
      lastAtIndex + pdf.name.length + 1 + (needsSpace ? 1 : 0);

    // Focus and set cursor position
    requestAnimationFrame(() => {
      textareaElement.focus();
      textareaElement.setSelectionRange(newCursorPosition, newCursorPosition);
    });
  };

  const handleImageError = (imageUrl) => {
    setImageErrors((prev) => ({
      ...prev,
      [imageUrl]: true,
    }));
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-zinc-950 to-zinc-900 text-white">
      <Header
        onProductModalOpen={() => setIsProductModalOpen(true)}
        onDocumentModalOpen={() => setIsDocumentModalOpen(true)}
        onSettingsChange={handleSettingsChange}
        onToggleChat={() => setChatTab(!chatTab)}
        chatTab={chatTab}
      />
      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)]">
        <AsideChatHistory
          chatTab={chatTab}
          chatList={chatList}
          selectedChat={selectedChat}
          onChatSelect={selectChat}
          onChatDelete={deleteChat}
          onToggleChat={() => setChatTab(!chatTab)}
        />
        <main className="flex-grow overflow-hidden pb-4 flex flex-col items-center relative">
          <div className="w-full max-w-6xl px-3 md:px-6 flex flex-col h-full">
            <div className="flex-grow overflow-y-auto custom-scrollbar">
              <div className="h-full p-1 md:p-4">
                {chatMessages.length === 0 && !loading ? (
                  <HeroSection onQuerySelect={setQuery} />
                ) : (
                  <div className="space-y-6 md:space-y-8 pb-20 md:pb-24">
                    {chatMessages.map((msg, index) => (
                      <div
                        key={index}
                        className="flex w-full flex-col justify-between mb-4 border-b border-zinc-800/50 pb-6 md:pb-8 animate-fade-in"
                      >
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-normal mb-3 md:mb-4 mt-2 md:mt-4 font-poppins text-zinc-200">
                          {msg.query}
                        </h1>
                        <div className="flex flex-col lg:flex-row gap-4 w-full">
                          <div
                            className={`${
                              !msg.online_images?.length &&
                              !msg.online_videos?.length
                                ? "w-full"
                                : "w-full lg:w-3/4"
                            }`}
                          >
                            <div className="mb-2 rounded-t-2xl text-md md:text-lg lg:text-xl mt-2 flex justify-start items-center gap-2">
                              <p className="text-blue-400 text-sm md:text-md animate-pulse">
                                <BsGlobe2 />
                              </p>
                              <span className="text-zinc-300">Answer</span>
                            </div>
                            <OnlineSources
                              links={msg.online_links}
                              metadata={metadata}
                            />
                            <div className="bg-zinc-800/50 rounded-lg p-3 md:p-4 lg:p-6 border border-zinc-700/50">
                              <StyledMarkdown content={msg.answer} />
                            </div>

                            <div className="flex flex-row justify-end gap-2 md:gap-3 items-center mt-3 md:mt-4">
                              <p className="text-zinc-400 text-xs md:text-sm flex items-center gap-1 md:gap-2">
                                <span className="flex items-center gap-1">
                                  <BsDatabase
                                    className={
                                      msg.status.useDatabase === true
                                        ? "text-green-500"
                                        : "text-red-500"
                                    }
                                  />
                                  <span className="hidden xs:inline">
                                    Database
                                  </span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <BsGlobe2
                                    className={
                                      msg.status.useOnlineContext === true
                                        ? "text-green-500"
                                        : "text-red-500"
                                    }
                                  />
                                  <span className="hidden xs:inline">
                                    Online Context
                                  </span>
                                </span>
                              </p>
                              <TextToSpeech text={msg.answer} />
                              <button
                                onClick={() => copyToClipboard(msg.answer)}
                                className="text-zinc-400 hover:text-blue-400 transition-colors duration-300"
                              >
                                <FaCopy />
                              </button>
                            </div>

                            <PdfReferences references={msg.pdf_references} />

                            <RelevantQueries
                              queries={msg.relevant_queries}
                              onQuerySelect={setQuery}
                            />
                          </div>
                          {(msg.online_images?.length > 0 ||
                            msg.online_videos?.length > 0) && (
                            <div className="w-full lg:w-1/4 p-2 md:p-3 gap-2 mt-2 lg:mt-0 lg:sticky lg:top-4 lg:self-start">
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                                {msg.online_images?.length > 0 && (
                                  <OnlineImages images={msg.online_images} />
                                )}
                                {msg.online_videos?.length > 0 && (
                                  <OnlineVideos videos={msg.online_videos} />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div
                        key="loading"
                        className="border-b border-zinc-800/50 pb-6 md:pb-8 animate-fade-in"
                      >
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-normal mb-3 md:mb-4 mt-2 md:mt-4 font-poppins text-zinc-200">
                          {query}
                        </h1>
                        <QueryResultSkeleton />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="w-full pt-2 sticky bottom-0mt-auto">
              <SearchBar
                query={query}
                loading={loading}
                onSubmit={handleSubmit}
                onQueryChange={handleQueryChange}
                showSuggestions={showSuggestions}
                pdfList={pdfList}
                suggestionIndex={suggestionIndex}
                setSuggestionIndex={setSuggestionIndex}
                onTranscriptChange={handleTranscriptChange}
                setShowSuggestions={setShowSuggestions}
                settings={settings}
                handleSettingsChange={handleSettingsChange}
                chosenPdfs={chosenPdfs}
                setChosenPdfs={setChosenPdfs}
              />
            </div>
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
