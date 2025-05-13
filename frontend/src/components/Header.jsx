import React, { useState, useEffect, useRef } from "react";
import { FaFileAlt, FaTimes } from "react-icons/fa";
import { RiLogoutBoxRLine, RiMenu3Line, RiChatNewLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import logo from "../assets/wlogo.png";

function Header({ onDocumentModalOpen, onToggleChat, chatTab }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    navigate("/", { replace: true });
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !event.target.closest('button[aria-label="Toggle menu"]')
      ) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <header className="bg-zinc-900 border-b border-blue-400/20 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        {/* Logo and Chat Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Chat Toggle Button */}
          <button
            onClick={onToggleChat}
            className="flex items-center justify-center p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700/50 hover:border-blue-400/30 transition-all duration-300"
            aria-label="Toggle chat sidebar"
          >
            <RiMenu3Line className="text-blue-400 text-lg" />
          </button>

          {/* New Chat Button */}
          <a
            href="/home"
            className="flex items-center justify-center p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700/50 hover:border-blue-400/30 transition-all duration-300"
            aria-label="New chat"
          >
            <RiChatNewLine className="text-blue-400 text-lg" />
          </a>

          {/* Logo */}
          <img
            src={logo}
            alt="Logo"
            className="h-7 sm:h-9 md:h-10 hover:scale-105 transition-transform duration-300"
          />
          <p className="text-lg sm:text-xl md:text-2xl font-poppins font-semibold bg-gradient-to-tr from-blue-400 via-sky-400 to-blue-600 bg-clip-text text-transparent">
            GCN
          </p>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3 lg:gap-4">
          <button
            onClick={onDocumentModalOpen}
            className="flex items-center gap-1.5 lg:gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg border border-zinc-700/50 hover:border-blue-400/30 transition-all duration-300 group"
          >
            <FaFileAlt
              size={14}
              className="text-blue-400 group-hover:scale-110 transition-transform"
            />
            <span className="text-zinc-300 group-hover:text-blue-400 text-sm lg:text-base">
              Manage Documents
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 lg:gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg border border-zinc-700/50 hover:border-blue-400/30 transition-all duration-300 group"
            aria-label="Logout"
          >
            <RiLogoutBoxRLine className="text-blue-400 text-lg" />
            <span className="text-zinc-300 group-hover:text-blue-400 text-sm lg:text-base">
              Logout
            </span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-1.5 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <FaTimes className="text-blue-400 text-lg" />
          ) : (
            <RiMenu3Line className="text-blue-400 text-lg" />
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <div
        ref={menuRef}
        className={`absolute left-0 right-0 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-700 shadow-xl z-40 transition-all duration-300 ${
          mobileMenuOpen
            ? "max-h-[300px] opacity-100 translate-y-0"
            : "max-h-0 opacity-0 -translate-y-2 pointer-events-none overflow-hidden"
        }`}
      >
        <div className="container mx-auto px-4 py-3 flex flex-col gap-2">
          <button
            onClick={() => {
              onDocumentModalOpen();
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 p-2.5 rounded-lg border border-zinc-700/50 hover:border-blue-400/30 transition-all duration-300 w-full text-left"
          >
            <FaFileAlt className="text-blue-400" />
            <span className="text-zinc-300 text-sm">Manage Documents</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 p-2.5 rounded-lg border border-zinc-700/50 hover:border-blue-400/30 transition-all duration-300 w-full text-left"
          >
            <RiLogoutBoxRLine className="text-blue-400" />
            <span className="text-zinc-300 text-sm">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
