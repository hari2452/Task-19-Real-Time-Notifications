import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {

  // Decide which theme should be used when
  // the application opens.
  const getInitialTheme = () => {

    // 1. First check whether the user has
    // already selected a theme.
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    // 2. If there is no saved preference,
    // check the operating-system preference.
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    return prefersDark ? "dark" : "light";
  };

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {

    // Apply the selected theme to:
    // <html data-theme="light">
    // or
    // <html data-theme="dark">
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    // Remember the user's choice.
    localStorage.setItem("theme", theme);

  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "light"
        ? "dark"
        : "light"
    );
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
