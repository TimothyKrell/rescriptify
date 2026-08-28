import fs from "node:fs/promises";
import path from "node:path";
import type { Project } from "../shared/types.js";

const root = path.resolve("data");
const file = path.join(root, "projects.json");
export async function ensureStore() { await fs.mkdir(path.join(root, "uploads"), { recursive: true }); try { await fs.access(file); } catch { await fs.writeFile(file, "[]\n"); } }
export async function listProjects(): Promise<Project[]> { await ensureStore(); return JSON.parse(await fs.readFile(file, "utf8")); }
export async function saveProject(project: Project) { const all = await listProjects(); const index = all.findIndex((item) => item.id === project.id); if (index >= 0) all[index] = project; else all.unshift(project); await fs.writeFile(file, JSON.stringify(all, null, 2) + "\n"); return project; }
export const uploadRoot = path.join(root, "uploads");
