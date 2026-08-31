
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./tailwind.css";
  import "./index.css";

  const savedTheme = localStorage.getItem('fintrack_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', savedTheme ? savedTheme === 'dark' : prefersDark);

  createRoot(document.getElementById("root")!).render(<App />);
