import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink: "#162236", mint: "#60e6c5", cloud: "#f5f7fb" } } },
  plugins: []
} satisfies Config;

