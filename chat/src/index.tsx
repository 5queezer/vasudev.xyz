import { createRoot } from "react-dom/client";
import { ChatWidget } from "./ChatWidget";

function mount() {
  const root = document.getElementById("chat-widget-root");
  if (!root) return;

  const apiUrl = root.dataset.apiUrl || "";
  const postUrl = root.dataset.postUrl || "";

  createRoot(root).render(<ChatWidget apiUrl={apiUrl} postUrl={postUrl} />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
