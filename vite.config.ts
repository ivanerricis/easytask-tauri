import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      output: {
        // Stable vendor chunks: better caching and a smaller entry chunk
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined
          if (id.includes("@radix-ui") || id.includes("radix-ui")) return "radix"
          if (id.includes("i18next")) return "i18next"
          if (id.includes("@dnd-kit")) return "dnd-kit"
          if (id.includes("lucide-react")) return "lucide"
          if (id.includes("@tanstack")) return "tanstack"
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return "react"
          return undefined
        },
      },
    },
  }
})