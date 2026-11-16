import "./bufferPolyfill";
// Must run before the app (and the auth client) loads, so link errors are kept.
import "./lib/captureConfirmLinkError";
import { applyInternalUrlSwitch } from "./lib/internalTraffic";
import { isInApp } from "./lib/inApp";
// Mirrors the inline index.html switch (?c8_internal=1 / 0).
applyInternalUrlSwitch();
// Remember ?app=1 before a redirect can drop it from the URL.
isInApp();
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";

createRoot(document.getElementById("root")!).render(<App />);
void registerServiceWorker();
