import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Tokens first, then the rules that reference them.
import "./styles/tokens.css";
import "./styles/app.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
