import "./bufferPolyfill";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";
import { captureConfirmLinkError } from "./lib/confirmLinkError";

captureConfirmLinkError();

createRoot(document.getElementById("root")!).render(<App />);
void registerServiceWorker();
