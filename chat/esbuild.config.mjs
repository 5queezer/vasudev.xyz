import { build } from "esbuild";

await build({
  entryPoints: ["src/index.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  outfile: "../static/js/chat.js",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
