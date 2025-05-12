import React, { useState } from "react";
import Header from "./Header";
import SearchBar from "./SearchBar";

function Home() {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pdfList, setPdfList] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [chosenPdfs, setChosenPdfs] = useState([]);
  const [settings, setSettings] = useState({
    useOnlineContext: false,
    useDatabase: true,
  });

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const handleTranscriptChange = (transcript) => {
    setQuery(transcript);
  };

  const handleSettingsChange = (newSettings) => {
    console.log("New settings:", newSettings); // Debug log
    setSettings(newSettings);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      console.log("Submitting with settings:", settings); // Debug log

      const payload = {
        query,
        settings: {
          useOnlineContext: settings.useOnlineContext,
          useDatabase: settings.useDatabase,
        },
        chosen_pdfs: chosenPdfs.map((pdf) => pdf.name),
      };

      console.log("Request payload:", payload); // Debug log

      const response = await fetch("http://localhost:5000/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Handle the response data
      console.log("Response:", data); // Debug log
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-zinc-950 to-zinc-900 text-white">
      <Header
        onProductModalOpen={() => setIsProductModalOpen(true)}
        onDocumentModalOpen={() => setIsDocumentModalOpen(true)}
      />
      <div className="flex flex-row">
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
          onSettingsChange={handleSettingsChange}
          chosenPdfs={chosenPdfs}
          setChosenPdfs={setChosenPdfs}
        />
      </div>
    </div>
  );
}

export default Home;
