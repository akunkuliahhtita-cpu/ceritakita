import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { orange: { 400: "#F9A03F" }, pink: { 500: "#EC4F8B" }, magenta: { 600: "#C93A8E" }, purple: { 600: "#8E2F9C", 800: "#5E1F73" }, lilac: "#F1E7FA", blush: "#FDE6F1", peach: "#FFEBDD", sage: "#E4F1EC", ink: "#2A1236", muted: "#7A6A86" },
    borderRadius: { xl2: "36px", xl3: "56px" }, boxShadow: { soft: "0 12px 40px -12px rgba(142,47,156,.25)" } } },
  plugins: [] } satisfies Config;
