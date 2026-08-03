import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { setupGlobalSessionInterceptor } from "./utils/sessionInterceptor";

setupGlobalSessionInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
