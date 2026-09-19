#!/usr/bin/env node
/** Summarizes the interface stack and existing surfaces without modifying the project. */
import { existsSync, readdirSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const project = resolve(args.includes("--project") ? args[args.indexOf("--project") + 1] : process.cwd());
const ignored = new Set([".git", "node_modules", "dist", "build", ".next", ".astro", "coverage"]);

async function json(path) {
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

async function files(path, listed = []) {
  if (!existsSync(path) || listed.length >= 80) return listed;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (ignored.has(entry.name) || listed.length >= 80) continue;
    const target = join(path, entry.name);
    if (entry.isDirectory()) await files(target, listed);
    else listed.push(relative(project, target));
  }
  return listed;
}

const packageJson = await json(join(project, "package.json"));
const composer = await json(join(project, "composer.json"));
const workspaceDeps = {};
for (const group of ["apps", "packages", "layers"]) {
  let names = [];
  try { names = readdirSync(join(project, group)); } catch { continue; }
  for (const name of names) {
    const value = await json(join(project, group, name, "package.json"));
    Object.assign(workspaceDeps, value.dependencies ?? {}, value.devDependencies ?? {});
  }
}
const packages = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}), ...workspaceDeps };
const composerPackages = { ...(composer.require ?? {}), ...(composer["require-dev"] ?? {}) };
const selected = (names) => names.filter((name) => name in packages || name in composerPackages);
const sourceFiles = await files(project);
const has = (path) => existsSync(join(project, path));
const routeRoots = ["src/app", "src/pages", "app", "pages", "resources/js/Pages", "routes"];
const componentRoots = ["src/components", "components", "resources/js/Components", "app/components"];
// Nuxt (monorepo): pages and components live in apps/*/app and layers/*/app.
function nuxtVueFiles(kind) {
  const found = [];
  for (const group of ["apps", "layers"]) {
    let names = [];
    try { names = readdirSync(join(project, group)); } catch { continue; }
    for (const name of names) {
      const base = join(project, group, name, "app", kind);
      const walk = (dir) => {
        let entries = [];
        try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
          if (ignored.has(entry.name)) continue;
          const target = join(dir, entry.name);
          if (entry.isDirectory()) walk(target);
          else if (entry.name.endsWith(".vue")) found.push(relative(project, target).replaceAll("\\", "/"));
        }
      };
      walk(base);
    }
  }
  return found;
}
const nuxtRoutes = nuxtVueFiles("pages");
const nuxtComponents = nuxtVueFiles("components");
const routes = (nuxtRoutes.length ? nuxtRoutes : sourceFiles.filter((path) => routeRoots.some((root) => path.startsWith(`${root}/`)))).slice(0, 200);
const components = (nuxtComponents.length ? nuxtComponents : sourceFiles.filter((path) => componentRoots.some((root) => path.startsWith(`${root}/`)))).slice(0, 200);

const report = {
  project,
  frameworks: selected(["nuxt", "laravel/framework", "next", "astro", "react", "vue", "svelte", "@inertiajs/react", "@inertiajs/vue3"]),
  routing: selected(["nuxt", "vue-router", "next", "react-router-dom", "@inertiajs/react", "@inertiajs/vue3"]).concat(has("routes/web.php") ? ["routes/web.php"] : []),
  styling: selected(["@nuxt/ui", "tailwindcss", "@tailwindcss/vite", "styled-components", "@emotion/react", "sass"]).concat(["tailwind.config.js", "tailwind.config.ts", "components.json"].filter(has)),
  components: selected(["@nuxt/ui", "@radix-ui/react-dialog", "@base-ui-components/react", "class-variance-authority", "@headlessui/react"]).concat(has("components.json") ? ["shadcn/ui"] : []),
  forms: selected(["react-hook-form", "@tanstack/react-form", "formik", "zod", "yup"]),
  tests: selected(["vitest", "@playwright/test", "cypress", "@testing-library/react", "pestphp/pest"]),
  current_routes: routes,
  current_components: components,
};

console.log(JSON.stringify(report, null, 2));
