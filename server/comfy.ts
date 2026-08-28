import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.COMFY_URL || "http://127.0.0.1:8188";
const defaultWorkflowPath = path.resolve("config/workflows/minimax-h3-dialogue-api.json");
const comfyOutput = process.env.COMFY_OUTPUT_DIR || "/home/timothykrell/ai/ComfyUI/output";
export async function comfyReady() { try { return (await fetch(`${baseUrl}/system_stats`, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; } }

export async function queueComfyJob(input: { sourcePath: string; prompt: string; duration: number }) {
  const workflowPath = process.env.COMFY_WORKFLOW_PATH || defaultWorkflowPath;
  const workflow = JSON.parse(await fs.readFile(path.resolve(workflowPath), "utf8"));
  const graph = workflow.prompt || workflow;
  const comfyInput = process.env.COMFY_INPUT_DIR || "/home/timothykrell/ai/ComfyUI/input";
  const stagedName = `rescript_${Date.now()}_${path.basename(input.sourcePath)}`;
  await fs.copyFile(input.sourcePath, path.join(comfyInput, stagedName));
  let promptSet = false;
  let videoSet = false;
  for (const node of Object.values(graph) as Array<{ class_type?: string; inputs?: Record<string, unknown>; _meta?: { title?: string } }>) {
    if (!node.inputs) continue;
    const title = node._meta?.title?.toLowerCase() || "";
    if (node.class_type === "MiniMaxH3ReferenceToVideo") {
      node.inputs.prompt = input.prompt;
      node.inputs.length = Math.max(5, Math.ceil(input.duration * 24 / 17) * 17 + 5);
      promptSet = true;
    }
    if ((node.class_type === "LoadVideo" || node.class_type === "VHS_LoadVideo") && (!videoSet || title.includes("source"))) {
      if ("video" in node.inputs) node.inputs.video = stagedName;
      else node.inputs.file = stagedName;
      videoSet = true;
    }
  }
  if (!promptSet || !videoSet) throw new Error("The Comfy workflow must contain MiniMaxH3ReferenceToVideo and LoadVideo nodes.");
  const response = await fetch(`${baseUrl}/prompt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: graph, client_id: "rescript-studio" }) });
  if (!response.ok) throw new Error(`ComfyUI rejected the workflow: ${await response.text()}`);
  return response.json() as Promise<{ prompt_id: string }>;
}

type ComfyHistory = {
  outputs?: Record<string, { images?: Array<{ filename: string; subfolder?: string; type?: string }> }>;
  status?: { completed?: boolean; status_str?: string; messages?: Array<[string, { exception_message?: string }]> };
};

export async function getComfyJob(jobId: string) {
  const response = await fetch(`${baseUrl}/history/${encodeURIComponent(jobId)}`);
  if (!response.ok) throw new Error(`Could not read ComfyUI job ${jobId}`);
  const jobs = await response.json() as Record<string, ComfyHistory>;
  const job = jobs[jobId];
  if (!job) return { status: "running" as const };
  if (!job.status?.completed || job.status.status_str !== "success") {
    const failed = job.status?.status_str === "error" || job.status?.messages?.some(([type]) => type === "execution_error");
    const message = job.status?.messages?.find(([type]) => type === "execution_error")?.[1]?.exception_message;
    return failed ? { status: "failed" as const, error: message || "ComfyUI generation failed" } : { status: "running" as const };
  }
  const media = Object.values(job.outputs || {}).flatMap((output) => output.images || []).find((item) => item.type === "output" && item.filename.toLowerCase().endsWith(".mp4"));
  if (!media) return { status: "failed" as const, error: "ComfyUI completed without an MP4 output" };
  const outputRoot = path.resolve(comfyOutput);
  const outputPath = path.resolve(outputRoot, media.subfolder || "", media.filename);
  if (!outputPath.startsWith(`${outputRoot}${path.sep}`)) throw new Error("ComfyUI returned an unsafe output path");
  return { status: "complete" as const, outputPath };
}
