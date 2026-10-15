import "./styles/style.css";
import { createLocalStorageAdapter } from "./storage/storage";
import { mountApp } from "./ui/app";

mountApp(document.querySelector<HTMLDivElement>("#app")!, createLocalStorageAdapter());
