"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");

  // Apply theme to <html>
  useEffect(() => {
    const root = window.document.documentElement;
    const saved = localStorage.getItem("theme") as Theme | null;
    let applied: Theme = theme;

    if (theme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applied = systemDark ? "dark" : "light";
    }
    if (saved && saved !== theme) {
      setThemeState(saved);
      applied = saved === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : saved;
    }
    root.classList.remove("light", "dark");
    root.classList.add(applied);

    // Listen for system changes if "system" is selected
    let mql: MediaQueryList | null = null;
    const handleSystem = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        root.classList.remove("light", "dark");
        root.classList.add(e.matches ? "dark" : "light");
      }
    };
    if (theme === "system") {
      mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", handleSystem);
    }
    return () => {
      if (mql) mql.removeEventListener("change", handleSystem);
    };
    // eslint-disable-next-line
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
