import React, { useState, useMemo } from "react";
import {
  FaTrash,
  FaSearch,
  FaSortAmountDown,
  FaSortAmountUp,
} from "react-icons/fa";
import { RiMenu3Line, RiChatNewLine } from "react-icons/ri";

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
      {/* Sidebar */}
      <aside
        className={`${
          chatTab
            ? "w-full sm:w-[300px] md:w-[350px] opacity-100 translate-x-0"
            : " translate-x-[-90%] w-0"
        }  transition-all duration-700 ease-in-out fixed sm:relative z-20 
        h-[calc(100vh-64px)] flex flex-row justify-center`}
      >
        <div
          className={`bg-zinc-900/50 backdrop-blur-sm overflow-clip border-r border-zinc-800/50 
        text-white h-full p-2 overflow-y-auto flex flex-col gap-3 transition-all ease-in-out duration-300 ${
          chatTab ? "opacity-100" : "opacity-0"
        }`}
        >
          {/* Search and Sort Controls */}
          <div className=" bg-zinc-900/95 backdrop-blur-lg rounded-lg p-3 border border-zinc-800/50 shadow-lg">
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-800/50 text-zinc-300 placeholder-zinc-500 rounded-lg 
                         px-4 py-2 pl-10 border border-zinc-700/50 focus:border-blue-400/30 
                         focus:outline-none focus:ring-1 focus:ring-blue-400/30 transition-all duration-300"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
            </div>
            <button
              onClick={() =>
                setSortOrder(sortOrder === "desc" ? "asc" : "desc")
              }
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-blue-400 
                       transition-colors duration-300 group"
            >
              {sortOrder === "desc" ? (
                <FaSortAmountDown className="group-hover:text-blue-400" />
              ) : (
                <FaSortAmountUp className="group-hover:text-blue-400" />
              )}
              <span>Sort by {sortOrder === "desc" ? "Newest" : "Oldest"}</span>
            </button>
          </div>

          {/* Chat List */}
          <div className="flex flex-col gap-3">
            {filteredAndSortedChats.map((chat) => (
              <div
                key={chat.chat_id}
                className={`w-full flex justify-between text-left bg-zinc-800/50 hover:bg-zinc-700/50 
                         border border-zinc-700/50 hover:border-blue-400/30 p-3 rounded-lg 
                         transition-all duration-300 ${
                           selectedChat?.chat_id === chat.chat_id
                             ? "bg-blue-500/10 border-blue-400/30"
                             : ""
                         }`}
              >
                <button
                  className="flex-1 text-left flex items-center justify-between w-full"
                  onClick={() => onChatSelect(chat)}
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
                    <div className="font-normal overflow-clip font-poppins text-zinc-300 truncate flex-1">
                      {chat.name.slice(0, 25).replace(`"`, ``) + "..." ||
                        "New Chat"}
                    </div>
                    {chat.created_at && (
                      <div className="text-xs text-zinc-500">
                        {new Date(chat.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => onChatDelete(chat.chat_id)}
                  className="text-blue-400 ml-3 hover:text-red-300 transition-colors duration-300 self-center"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col justify-start pt-3">
          <button
            onClick={onToggleChat}
            className="flex items-center gap-2 ml-4 bg-zinc-900/50 hover:bg-zinc-800/50 
                   p-2 rounded-lg backdrop-blur-sm border border-zinc-800/50 
                   hover:border-blue-400/30 transition-all duration-300"
          >
            <RiMenu3Line className="text-blue-400" />
          </button>
          <a
            href="/home"
            className="flex items-center gap-2 ml-4 bg-zinc-900/50 hover:bg-zinc-800/50 
                   p-2 rounded-lg mt-2 backdrop-blur-sm border border-zinc-800/50 
                   hover:border-blue-400/30 transition-all duration-300"
          >
            <RiChatNewLine className="text-blue-400" />
          </a>
        </div>
      </aside>
    </>
  );
}

export default AsideChatHistory;
