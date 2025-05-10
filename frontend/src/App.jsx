import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Loader from "./components/Loader";

// Lazy load the pages for better performance
const Home = React.lazy(() => import("./pages/Home"));
const Login = React.lazy(() => import("./pages/Login"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Home />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
