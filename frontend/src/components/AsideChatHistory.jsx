import React, { useState, useMemo, useEffect } from "react";
import {
  FaTrash,
  FaSearch,
  FaSortAmountDown,
  FaSortAmountUp,
} from "react-icons/fa";

function AsideChatHistory({
  chatTab,
  chatList = [],
  selectedChat,
  onChatSelect,
  onChatDelete,
  onToggleChat,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // "asc" or "desc"
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  const filteredAndSortedChats = useMemo(() => {
    return chatList
      .filter((chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [chatList, searchQuery, sortOrder]);

  return (
    <>
      {/* Sidebar overlay for mobile - only visible when sidebar is open on mobile */}
      {isMobile && chatTab && (
        <div
          className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
          onClick={onToggleChat}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          chatTab
            ? "w-[85%] xs:w-[320px] sm:w-[300px] md:w-[320px] opacity-100 translate-x-0"
            : "translate-x-[-90%] w-0 md:translate-x-[-90%] opacity-0"
        } transition-all duration-300 ease-in-out fixed md:relative z-40
        h-[calc(100vh-64px)] flex flex-row justify-center`}
      >
        <div
          className={`bg-zinc-900/90 backdrop-blur-md overflow-clip border-r border-zinc-800/50 
        text-white h-full w-full xs:max-w-[350px] p-2 sm:p-3 overflow-y-auto flex flex-col gap-2 md:gap-3 
        transition-all ease-in-out duration-300`}
        >
          {/* Search and Sort Controls */}
          <div className="bg-zinc-900/95 backdrop-blur-lg rounded-lg p-2 border border-zinc-800/50 shadow-lg">
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-800/50 text-zinc-300 placeholder-zinc-500 rounded-lg 
                         px-3 py-1.5 pl-8 text-sm border border-zinc-700/50 focus:border-blue-400/30 
                         focus:outline-none focus:ring-1 focus:ring-blue-400/30 transition-all duration-300"
              />
              <FaSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-zinc-500 text-xs" />
            </div>
            <button
              onClick={() =>
                setSortOrder(sortOrder === "desc" ? "asc" : "desc")
              }
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-blue-400 
                       transition-colors duration-300 group"
            >
              {sortOrder === "desc" ? (
                <FaSortAmountDown className="group-hover:text-blue-400 text-xs" />
              ) : (
                <FaSortAmountUp className="group-hover:text-blue-400 text-xs" />
              )}
              <span>Sort by {sortOrder === "desc" ? "Newest" : "Oldest"}</span>
            </button>
          </div>

          {/* Chat List */}
          <div className="flex flex-col gap-1.5 flex-grow overflow-y-auto custom-scrollbar">
            {filteredAndSortedChats.length > 0 ? (
              filteredAndSortedChats.map((chat) => (
                <div
                  key={chat.chat_id}
                  className={`w-full flex justify-between text-left bg-zinc-800/50 hover:bg-zinc-700/50 
                           border border-zinc-700/50 hover:border-blue-400/30 p-2 rounded-lg 
                           transition-all duration-300 ${
                             selectedChat?.chat_id === chat.chat_id
                               ? "bg-blue-500/10 border-blue-400/30"
                               : ""
                           }`}
                >
                  <button
                    className="flex-1 text-left flex items-center justify-between w-full"
                    onClick={() => {
                      onChatSelect(chat);
                      if (isMobile) onToggleChat(); // Close sidebar on mobile after selection
                    }}
                  >
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-1">
                        {chat.product_colors &&
                          chat.product_colors.map((product, idx) => (
                            <div
                              key={`${chat.chat_id}-${product.id}-${idx}`}
                              className={`w-2 h-2 rounded-full bg-${product.color}-500 animate-pulse`}
                            />
                          ))}
                      </div>
                      <div className="text-xs font-normal overflow-clip w-5/6 font-poppins text-zinc-300 truncate flex-1">
                        {chat.name.slice(0, 25).replace(`"`, ``) + "..." ||
                          "New Chat"}
                      </div>
                      {chat.created_at && (
                        <div className="text-[10px] text-zinc-500">
                          {new Date(chat.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => onChatDelete(chat.chat_id)}
                    className="text-blue-400 ml-2 hover:text-red-300 transition-colors duration-300 self-center p-1"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-500 mt-4 text-sm">
                {searchQuery ? "No chats found" : "No chats yet"}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default AsideChatHistory;
