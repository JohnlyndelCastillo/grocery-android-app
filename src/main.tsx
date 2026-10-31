import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./styles/style.css";
import { createLocalStorageAdapter } from "./storage/storage";
import { App } from "./ui/App";

// One storage adapter for the whole app; swap it here for IndexedDB / Capacitor Preferences later.
const storage = createLocalStorageAdapter();

createRoot(document.querySelector<HTMLDivElement>("#app")!).render(
  <StrictMode>
    <App storage={storage} />
  </StrictMode>,
);
