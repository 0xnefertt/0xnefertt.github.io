import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import { writerChunks } from "../shared/build-chunks.mjs";
import { markdownStrongFallback } from "./markdown-strong-fallback.mjs";

export default defineConfig({
  site: "https://0xnefertt.github.io",
  i18n: { defaultLocale: "en", locales: ["en", "ko"], routing: { prefixDefaultLocale: false } },
  markdown: {
    processor: unified({ remarkPlugins: [markdownStrongFallback] }),
    shikiConfig: { theme: "github-dark-high-contrast" },
  },
  vite: { build: { rolldownOptions: { output: { codeSplitting: writerChunks() } } } },
});
