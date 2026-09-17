import { Buffer } from "buffer";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Buffer polyfill required by the Solana web3 libraries
if (!(globalThis as any).Buffer) {
  (globalThis as any).Buffer = Buffer;
}

createRoot(document.getElementById("root")!).render(<App />);
