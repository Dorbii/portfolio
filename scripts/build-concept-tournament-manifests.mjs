import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tournamentRoot = path.join(repoRoot, "design", "career-world", "concept-tournaments");

async function findManifestJson(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await findManifestJson(fullPath));
    if (entry.isFile() && entry.name === "tournament-set.json") results.push(fullPath);
  }
  return results;
}

const manifests = await findManifestJson(tournamentRoot);
for (const manifestPath of manifests.sort()) {
  const definition = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (!Array.isArray(definition.assets) || definition.assets.length < 2 || definition.assets.length > 64) {
    throw new Error(`${path.relative(repoRoot, manifestPath)} must define 2-64 assets`);
  }

  const output = `window.__CONCEPT_TOURNAMENT_SET__ = ${JSON.stringify(definition, null, 2)};\n`;
  const scriptPath = path.join(path.dirname(manifestPath), "tournament-set.js");
  await fs.writeFile(scriptPath, output, "utf8");
  console.log(path.relative(repoRoot, scriptPath));
}
