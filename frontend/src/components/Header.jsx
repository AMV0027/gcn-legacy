import React from "react";
import { FaBook, FaFileAlt } from "react-icons/fa";
import logo from "../assets/wlogo.png";

function Header({ onProductModalOpen, onDocumentModalOpen }) {
  return (
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
            onClick={onDocumentModalOpen}
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
            onClick={onProductModalOpen}
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
  );
}

export default Header;
