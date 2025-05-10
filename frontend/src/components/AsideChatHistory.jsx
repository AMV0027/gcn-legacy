import React from "react";
import { FaTrash } from "react-icons/fa";

function AsideChatHistory({
  chatTab,
  chatList = [],
  selectedChat,
  onChatSelect,
  onChatDelete,
}) {
  return (
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
              onClick={() => onChatSelect(chat)}
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
                {chat.name.slice(0, 25).replace(`"`, ``) + "..." || "New Chat"}
              </div>
            </button>
            <button
              onClick={() => onChatDelete(chat.chat_id)}
              className="text-blue-400 ml-3 hover:text-red-300 transition-colors duration-300"
            >
              <FaTrash />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default AsideChatHistory;
