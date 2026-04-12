import { createRoot } from "react-dom/client";
import { ChatWidget } from "./ChatWidget";

function mount() {
  const root = document.getElementById("chat-widget-root");
  if (!root) return;

  const apiUrl = root.dataset.apiUrl || "";
  const postUrl = root.dataset.postUrl || "";
  const mode = (root.dataset.mode || "post") as "post" | "index";
  const lang = root.dataset.lang || "en";

  createRoot(root).render(<ChatWidget apiUrl={apiUrl} postUrl={postUrl} mode={mode} lang={lang} />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
