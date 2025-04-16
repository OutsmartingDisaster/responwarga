"use client";
import { useTheme } from "@/app/providers";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 bg-zinc-800/80 rounded px-3 py-2 shadow">
      <button
        aria-label="Light mode"
        className={`p-1 rounded ${theme === "light" ? "bg-blue-600 text-white" : "text-zinc-300 hover:bg-zinc-700"}`}
        onClick={() => setTheme("light")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.95 7.07l-1.41-1.41M6.34 6.34L4.93 4.93m12.02 0l-1.41 1.41M6.34 17.66l-1.41 1.41" />
        </svg>
      </button>
      <button
        aria-label="System mode"
        className={`p-1 rounded ${theme === "system" ? "bg-blue-600 text-white" : "text-zinc-300 hover:bg-zinc-700"}`}
        onClick={() => setTheme("system")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.95 7.07l-.71-.71M6.34 6.34l-.71-.71" />
          <circle cx="12" cy="12" r="5" />
        </svg>
      </button>
      <button
        aria-label="Dark mode"
        className={`p-1 rounded ${theme === "dark" ? "bg-blue-600 text-white" : "text-zinc-300 hover:bg-zinc-700"}`}
        onClick={() => setTheme("dark")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
        </svg>
      </button>
    </div>
  );
}
