# Rescript Studio

A local-first dialogue replacement editor for MiniMax H3 and ComfyUI.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:8787` and expects ComfyUI on `http://127.0.0.1:8188`.

## Configure generation

The bundled `config/workflows/minimax-h3-dialogue-api.json` uses the MiniMax H3 Ref2VA models already installed on this machine. No workflow environment variable is required. Set `COMFY_WORKFLOW_PATH` only to override it with another API-format workflow.

The app patches the source video, prompt, and H3 duration before submitting to ComfyUI. Uploaded projects and metadata are local under `data/`.
The selected region is frame-accurately extracted with FFmpeg and staged into `COMFY_INPUT_DIR` (which defaults to this machine's `/home/timothykrell/ai/ComfyUI/input`).
Generation canvases preserve the source aspect ratio using MiniMax H3-compatible 32-pixel dimensions. Stitched replacements use a minimal center crop to match the source canvas exactly, without stretching or letterboxing.

## Architecture

- Vite, React 19, Tailwind CSS 4, Radix/shadcn-style UI primitives
- Express media/project API with FFprobe metadata extraction
- Provider boundary for ComfyUI job submission
- MiniMax H3 full-reference prompt generation focused only on dialogue and lip motion changes
- ComfyUI history reconciliation with persistent generation versions
- Automatic FFmpeg segment extraction, output import, and full-video stitching
- Original, generated-segment, and stitched-full-video previews
