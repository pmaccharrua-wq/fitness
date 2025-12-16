import { build } from "esbuild";

async function buildApi() {
  console.log("Building API for Vercel...");
  
  await build({
    entryPoints: ["api/index.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    format: "esm",
    outfile: "api/index.js",
    external: ["pg-native"],
    banner: {
      js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`
    },
    logLevel: "info",
  });
  
  console.log("API build complete!");
}

buildApi().catch((err) => {
  console.error(err);
  process.exit(1);
});
