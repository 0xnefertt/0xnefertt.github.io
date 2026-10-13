import { defineConfig } from "vite";
import { writerChunks } from "../shared/build-chunks.mjs";

export default defineConfig({
  build: { rolldownOptions: { output: { codeSplitting: writerChunks() } } },
});
