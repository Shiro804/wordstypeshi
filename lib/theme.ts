// Light mode has been removed; the app is dark-only.
export function applyTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light");
  root.classList.add("dark");
}

