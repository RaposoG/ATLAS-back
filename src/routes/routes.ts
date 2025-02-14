import { FastifyInstance, FastifyPluginCallback } from "fastify";
import { readdirSync } from "fs";
import { join, basename } from "path";
import { pathToFileURL } from "url";

function getRouteFiles(dir: string): string[] {
  let results: string[] = [];
  const list = readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === "_errors") continue;
      results = results.concat(getRouteFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith(".ts") && basename(fullPath) !== "routes.ts") {
      results.push(fullPath);
    }
  }
  return results;
}

function wrapAsPlugin(fn: Function): FastifyPluginCallback {
  return (instance, opts, done) => {
    Promise.resolve(fn(instance, opts))
      .then(() => done())
      .catch(done);
  };
}

export async function registerRoutes(app: FastifyInstance) {
  const routesDir = __dirname;
  const routeFiles = getRouteFiles(routesDir);
  for (const file of routeFiles) {
    const fileURL = pathToFileURL(file).href;
    console.log(`Registering route: ${fileURL}`);
    const imported = await import(fileURL);
    // Registra todas as funções exportadas no módulo
    for (const key of Object.keys(imported)) {
      const exported = imported[key];
      if (typeof exported === "function") {
        app.register(wrapAsPlugin(exported));
      }
    }
  }
}
