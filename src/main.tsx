import "./bufferPolyfill";
// Must run before the app (and the auth client) loads, so link errors are kept.
import "./lib/captureConfirmLinkError";
import { applyInternalUrlSwitch } from "./lib/internalTraffic";
// Mirrors the inline index.html switch (?c8_internal=1 / 0).
applyInternalUrlSwitch();
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";

createRoot(document.getElementById("root")!).render(<App />);
void registerServiceWorker();
