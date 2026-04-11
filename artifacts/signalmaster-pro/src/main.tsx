import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Migração v8: atualiza minScore=77 (antigo default restritivo) → 66
try {
  const stored = JSON.parse(localStorage.getItem('smpCfg7') || '{}');
  if (stored.minScore === 77 || stored.minScore === undefined) {
    stored.minScore = 66;
    stored.forteOnly = false;
    localStorage.setItem('smpCfg7', JSON.stringify(stored));
  }
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
