import { execFile } from "node:child_process";
import express from "express";
import fs from "node:fs/promises";
import multer from "multer";
import path from "node:path";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import type { Project } from "../shared/types.js";
import { comfyReady, getComfyJob, queueComfyJob } from "./comfy.js";
import { buildH3EditPrompt } from "./prompt.js";
import { ensureStore, listProjects, saveProject, uploadRoot } from "./store.js";

await ensureStore();
const app = express();
const upload = multer({ dest: uploadRoot, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });
const syncingJobs = new Set<string>();

async function stitchReplacement(project: Project, take: Project["takes"][number], replacementPath: string, generationId: string) {
  if (!project.video) throw new Error("Project video is missing");
  const sourcePath = path.join(uploadRoot, project.video.filename);
  const outputName = `${project.id}_${generationId}_stitched.mp4`;
  const outputPath = path.join(uploadRoot, outputName);
  const duration = take.end - take.start;
  const filter = [
    `[0:v]trim=start=0:end=${take.start},setpts=PTS-STARTPTS,fps=24,format=yuv420p[beforev]`,
    `[1:v]setpts=PTS-STARTPTS,scale=${project.video.width}:${project.video.height}:force_original_aspect_ratio=increase,crop=${project.video.width}:${project.video.height},tpad=stop_mode=clone:stop_duration=${duration},trim=duration=${duration},fps=24,format=yuv420p[replacev]`,
    `[0:v]trim=start=${take.end},setpts=PTS-STARTPTS,fps=24,format=yuv420p[afterv]`,
    `[0:a]atrim=start=0:end=${take.start},asetpts=PTS-STARTPTS,aresample=48000[beforea]`,
    `[1:a]asetpts=PTS-STARTPTS,aresample=48000,apad=pad_dur=${duration},atrim=duration=${duration}[replacea]`,
    `[0:a]atrim=start=${take.end},asetpts=PTS-STARTPTS,aresample=48000[aftera]`,
    `[beforev][beforea][replacev][replacea][afterv][aftera]concat=n=3:v=1:a=1[outv][outa]`,
  ].join(";");
  await promisify(execFile)("ffmpeg", ["-i", sourcePath, "-i", replacementPath, "-filter_complex", filter, "-map", "[outv]", "-map", "[outa]", "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-c:a", "aac", "-movflags", "+faststart", "-y", outputPath], { maxBuffer: 10 * 1024 * 1024 });
  return `/media/${outputName}`;
}
app.use(express.json({ limit: "2mb" }));
app.use("/media", express.static(uploadRoot));
app.get("/api/health", async (_req, res) => res.json({ ok: true, comfy: await comfyReady(), provider: "comfy-local" }));
app.get("/api/projects", async (_req, res) => res.json(await listProjects()));
app.post("/api/projects/:id/sync", async (req, res) => {
  const project = (await listProjects()).find((item) => item.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  for (const take of project.takes) {
    if (!take.generations?.length && (take as typeof take & { jobId?: string }).jobId) {
      const legacy = take as typeof take & { jobId: string };
      take.generations = [{ id: nanoid(), jobId: legacy.jobId, createdAt: project.updatedAt, status: take.status === "failed" ? "failed" : "queued" }];
    }
    for (const generation of take.generations || []) {
      if (!generation.jobId || generation.status === "complete" || generation.status === "failed" || syncingJobs.has(generation.jobId)) continue;
      syncingJobs.add(generation.jobId);
      try {
        const job = await getComfyJob(generation.jobId);
        if (job.status === "running") generation.status = "running";
        if (job.status === "failed") { generation.status = "failed"; generation.error = job.error; }
        if (job.status === "complete") {
          generation.status = "stitching";
          const segmentName = `${project.id}_${generation.id}_replacement.mp4`;
          await fs.copyFile(job.outputPath, path.join(uploadRoot, segmentName));
          generation.segmentUrl = `/media/${segmentName}`;
          generation.stitchedUrl = await stitchReplacement(project, take, job.outputPath, generation.id);
          generation.status = "complete";
        }
      } catch (error) {
        generation.status = "failed";
        generation.error = error instanceof Error ? error.message : "Could not process generation";
      } finally {
        syncingJobs.delete(generation.jobId);
      }
    }
    const latest = take.generations?.[take.generations.length - 1];
    take.status = latest?.status === "complete" ? "complete" : latest?.status === "failed" ? "failed" : latest?.status || take.status;
  }
  project.updatedAt = new Date().toISOString();
  res.json(await saveProject(project));
});
app.post("/api/projects", async (req, res) => { const now = new Date().toISOString(); const project: Project = { id: nanoid(), name: req.body.name || "Untitled scene", createdAt: now, updatedAt: now, takes: [] }; res.status(201).json(await saveProject(project)); });
app.put("/api/projects/:id", async (req, res) => { const projects = await listProjects(); if (!projects.some((p) => p.id === req.params.id)) return res.status(404).json({ error: "Project not found" }); res.json(await saveProject({ ...req.body, id: req.params.id, updatedAt: new Date().toISOString() })); });
app.post("/api/projects/:id/video", upload.single("video"), async (req, res) => { try { if (!req.file) return res.status(400).json({ error: "No video supplied" }); const projects = await listProjects(); const project = projects.find((p) => p.id === req.params.id); if (!project) return res.status(404).json({ error: "Project not found" }); const extension = path.extname(req.file.originalname) || ".mp4"; const finalName = `${req.file.filename}${extension}`; await fs.rename(req.file.path, path.join(uploadRoot, finalName)); const { stdout } = await promisify(execFile)("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=width,height", "-select_streams", "v:0", "-of", "json", path.join(uploadRoot, finalName)]); const probe = JSON.parse(stdout); project.video = { url: `/media/${finalName}`, filename: finalName, duration: Number(probe.format.duration), width: probe.streams[0]?.width || 0, height: probe.streams[0]?.height || 0 }; project.name = project.name === "Untitled scene" ? req.file.originalname.replace(/\.[^.]+$/, "") : project.name; project.updatedAt = new Date().toISOString(); res.json(await saveProject(project)); } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : "Video upload failed" }); } });
app.post("/api/projects/:projectId/takes/:takeId/generate", async (req, res) => { try { const project = (await listProjects()).find((p) => p.id === req.params.projectId); const take = project?.takes.find((t) => t.id === req.params.takeId); if (!project?.video || !take) return res.status(404).json({ error: "Project, video, or take not found" }); const duration = take.end - take.start; const segmentName = `${project.id}_${take.id}_${Date.now()}.mp4`; const segmentPath = path.join(uploadRoot, segmentName); await promisify(execFile)("ffmpeg", ["-ss", String(take.start), "-i", path.join(uploadRoot, project.video.filename), "-t", String(duration), "-map", "0:v:0", "-map", "0:a?", "-r", "24", "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-c:a", "aac", "-y", segmentPath]); take.prompt = buildH3EditPrompt({ speaker: take.speaker, dialogue: take.text, duration }); const job = await queueComfyJob({ sourcePath: segmentPath, prompt: take.prompt, duration, sourceWidth: project.video.width, sourceHeight: project.video.height }); take.status = "queued"; const generation = { id: nanoid(), jobId: job.prompt_id, createdAt: new Date().toISOString(), status: "queued" as const, width: job.width, height: job.height }; take.generations = [...(take.generations || []), generation]; await saveProject(project); res.json({ take, generation }); } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : "Could not queue generation" }); } });
if (process.env.NODE_ENV === "production") { app.use(express.static("dist")); app.get("*splat", (_req, res) => res.sendFile(path.resolve("dist/index.html"))); }
app.listen(8787, () => console.log("Rescript API listening on http://localhost:8787"));
