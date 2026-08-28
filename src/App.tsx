import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Download,
  Film,
  FolderOpen,
  Gauge,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Redo2,
  Scissors,
  Settings2,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  Volume2,
  WandSparkles,
  X,
} from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";
import { Button } from "./components/Button";
import { cn, formatTime, type Generation, type Project, type Take } from "./lib";

const api = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(path, options);
  if (!response.ok)
    throw new Error((await response.json().catch(() => null))?.error || response.statusText);
  return response.json();
};

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-neutral-400">
      <span
        className={cn(
          "size-1.5 rounded-full",
          connected ? "bg-lime-300 shadow-[0_0_10px_#bef264]" : "bg-amber-400",
        )}
      />
      {connected ? "ComfyUI ready" : "ComfyUI offline"}
    </span>
  );
}

function EmptyVideo({ onUpload, busy }: { onUpload: (file: File) => void; busy: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <button
      onClick={() => input.current?.click()}
      className="group absolute inset-0 m-auto flex max-h-72 max-w-lg flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[.025] p-10 text-center transition hover:border-lime-300/50 hover:bg-lime-300/[.03]"
    >
      <input
        ref={input}
        hidden
        type="file"
        accept="video/*"
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
      />
      <span className="mb-5 grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[.06] text-lime-300 group-hover:scale-105">
        <Upload size={24} />
      </span>
      <strong className="display text-lg">
        {busy ? "Reading your footage..." : "Drop in the scene"}
      </strong>
      <span className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
        Upload MP4, MOV, or WebM. Your source stays local and is only sent to the configured
        generator.
      </span>
    </button>
  );
}

function Timeline({
  duration,
  current,
  take,
  onSeek,
  onRange,
}: {
  duration: number;
  current: number;
  take: Take | null;
  onSeek: (n: number) => void;
  onRange: (start: number, end: number) => void;
}) {
  const safeDuration = Math.max(duration, 1);
  const ticks = Array.from({ length: 9 }, (_, i) => (safeDuration / 8) * i);
  return (
    <div className="border-t border-white/10 bg-[#0c0d0f] px-4 pb-4 pt-3 md:px-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Undo2 size={15} />
          </Button>
          <Button variant="ghost" size="icon">
            <Redo2 size={15} />
          </Button>
          <span className="mx-1 h-4 w-px bg-white/10" />
          <Button variant="ghost" size="sm">
            <Scissors size={14} /> Split
          </Button>
        </div>
        <span className="font-mono text-xs text-neutral-500">
          {formatTime(current)} / {formatTime(duration)}
        </span>
      </div>
      <div className="relative h-28 overflow-hidden rounded-lg border border-white/10 bg-[#15171a]">
        <div className="absolute inset-x-0 top-0 flex h-6 justify-between border-b border-white/10 px-2 text-[10px] text-neutral-600">
          {ticks.map((t) => (
            <span key={t}>{t.toFixed(1)}s</span>
          ))}
        </div>
        <div className="absolute inset-x-0 top-6 h-12 border-b border-white/10 bg-[repeating-linear-gradient(90deg,#272a2d_0,#272a2d_8%,#202225_8%,#202225_12%)] opacity-70" />
        <div className="absolute left-0 top-[72px] grid h-7 w-20 place-items-center border-r border-white/10 bg-[#111315] text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          Dialogue
        </div>
        {take && (
          <div
            className="absolute top-[74px] h-6 overflow-hidden rounded border border-lime-300/50 bg-lime-300/15 px-2 text-[11px] leading-6 text-lime-200"
            style={{
              left: `max(80px, ${(take.start / safeDuration) * 100}%)`,
              width: `${Math.max(((take.end - take.start) / safeDuration) * 100, 2)}%`,
            }}
          >
            {take.text || "New replacement"}
          </div>
        )}
        <input
          aria-label="Timeline playhead"
          type="range"
          min={0}
          max={safeDuration}
          step={0.01}
          value={current}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
        />
        <div
          className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-lime-300 shadow-[0_0_8px_#bef264]"
          style={{ left: `${(current / safeDuration) * 100}%` }}
        >
          <span className="absolute -left-1 top-0 h-2 w-2 rotate-45 bg-lime-300" />
        </div>
      </div>
      {take && (
        <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
          <span>Selection</span>
          <input
            type="range"
            min={0}
            max={take.end - 0.25}
            step={0.04}
            value={take.start}
            onChange={(e) => onRange(Number(e.target.value), take.end)}
            className="min-w-0 flex-1"
          />
          <input
            type="range"
            min={take.start + 0.25}
            max={safeDuration}
            step={0.04}
            value={take.end}
            onChange={(e) => onRange(take.start, Number(e.target.value))}
            className="min-w-0 flex-1"
          />
          <span className="font-mono text-neutral-300">{(take.end - take.start).toFixed(2)}s</span>
        </div>
      )}
    </div>
  );
}

function TakeEditor({
  take,
  onChange,
  onGenerate,
  onDelete,
  activeView,
  onSelectView,
  busy,
}: {
  take: Take | null;
  onChange: (patch: Partial<Take>) => void;
  onGenerate: () => void;
  onDelete: () => void;
  activeView: string;
  onSelectView: (view: string) => void;
  busy: boolean;
}) {
  if (!take)
    return (
      <aside className="hidden w-[340px] shrink-0 border-l border-white/10 bg-[#0d0f11] p-6 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <WandSparkles className="mb-4 text-neutral-700" />
        <p className="text-center text-sm leading-6 text-neutral-500">
          Add a dialogue replacement to begin.
        </p>
      </aside>
    );
  return (
    <aside className="scrollbar-none hidden w-[340px] shrink-0 overflow-y-auto border-l border-white/10 bg-[#0d0f11] lg:block">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.2em] text-lime-300">
            Replacement take
          </div>
          <div className="mt-1 font-mono text-xs text-neutral-500">
            {formatTime(take.start)} - {formatTime(take.end)}
          </div>
        </div>
        <Button onClick={onDelete} variant="ghost" size="icon">
          <Trash2 size={15} />
        </Button>
      </div>
      <div className="space-y-6 p-5">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-neutral-400">Speaker</span>
          <input
            value={take.speaker}
            onChange={(e) => onChange({ speaker: e.target.value })}
            placeholder="Man in foreground"
            className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-lime-300/50"
          />
        </label>
        <label className="block">
          <div className="mb-2 flex justify-between text-xs font-semibold text-neutral-400">
            <span>New dialogue</span>
            <span className="font-normal text-neutral-600">{take.text.length} chars</span>
          </div>
          <textarea
            value={take.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="You can't handle HotPockets."
            rows={5}
            className="w-full resize-none rounded-md border border-white/10 bg-black/30 p-3 text-[15px] leading-6 outline-none placeholder:text-neutral-700 focus:border-lime-300/50"
          />
        </label>
        <div className="rounded-lg border border-white/10 bg-white/[.025] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Gauge size={14} className="text-lime-300" /> Delivery fit
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full",
                take.text.length / Math.max(take.end - take.start, 1) < 22
                  ? "w-3/4 bg-lime-300"
                  : "w-full bg-amber-400",
              )}
            />
          </div>
          <p className="mt-2 text-[11px] leading-5 text-neutral-500">
            Aim for a similar speaking length to preserve natural cadence.
          </p>
        </div>
        <div className="space-y-2 border-t border-white/10 pt-5 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-500">Model</span>
            <span>MiniMax H3 Ref2VA</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Source audio</span>
            <span className="flex items-center gap-1">
              <Check size={12} className="text-lime-300" /> Preserve ambience
            </span>
          </div>
        </div>
        <Button className="h-12 w-full" onClick={onGenerate} disabled={busy || !take.text.trim()}>
          {busy ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <Sparkles size={17} />
          )}
          {busy ? "Preparing generation..." : "Generate replacement"}
        </Button>
        <div className="border-t border-white/10 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300">Versions</span>
            <span className="text-[10px] uppercase tracking-widest text-neutral-600">
              {(take.generations || []).length} generated
            </span>
          </div>
          <button
            onClick={() => onSelectView("original")}
            className={cn(
              "mb-2 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
              activeView === "original"
                ? "border-lime-300/40 bg-lime-300/[.07]"
                : "border-white/10 bg-white/[.025] hover:bg-white/[.05]",
            )}
          >
            <span className="grid size-8 place-items-center rounded-md bg-white/[.06] text-neutral-400">
              <Film size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-xs">Original</strong>
              <span className="text-[10px] text-neutral-600">Unmodified source video</span>
            </span>
            {activeView === "original" && <Check size={14} className="text-lime-300" />}
          </button>
          <div className="space-y-2">
            {(take.generations || [])
              .slice()
              .reverse()
              .map((generation, reverseIndex) => {
                const number = (take.generations || []).length - reverseIndex;
                const fullView = `full:${generation.id}`;
                const isActive = activeView.includes(generation.id);
                return (
                  <div
                    key={generation.id}
                    className={cn(
                      "rounded-lg border p-3 transition",
                      isActive ? "border-lime-300/40 bg-lime-300/[.07]" : "border-white/10 bg-white/[.025]",
                    )}
                  >
                    <button
                      disabled={!generation.stitchedUrl}
                      onClick={() => onSelectView(fullView)}
                      className="flex w-full items-center gap-3 text-left disabled:cursor-default"
                    >
                      <span className="grid size-8 place-items-center rounded-md bg-white/[.06]">
                        {generation.status === "complete" ? (
                          <Play size={13} className="text-lime-300" />
                        ) : generation.status === "failed" ? (
                          <X size={13} className="text-red-300" />
                        ) : (
                          <LoaderCircle size={13} className="animate-spin text-amber-300" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-xs">Generation {number}</strong>
                        <span className="text-[10px] capitalize text-neutral-500">
                          {generation.status === "complete" ? "Full edit ready" : generation.status}
                        </span>
                      </span>
                      {activeView === fullView && <Check size={14} className="text-lime-300" />}
                    </button>
                    {generation.status === "complete" && generation.segmentUrl && (
                      <div className="mt-2 flex gap-2 border-t border-white/10 pt-2">
                        <button onClick={() => onSelectView(fullView)} className="text-[10px] font-semibold text-neutral-400 hover:text-white">
                          Full edit
                        </button>
                        <span className="text-neutral-700">/</span>
                        <button onClick={() => onSelectView(`segment:${generation.id}`)} className="text-[10px] font-semibold text-neutral-400 hover:text-white">
                          Segment only
                        </button>
                      </div>
                    )}
                    {generation.error && <p className="mt-2 text-[10px] leading-4 text-red-300">{generation.error}</p>}
                  </div>
                );
              })}
          </div>
        </div>
        {take.status === "failed" && (
          <p className="text-center text-xs text-red-300">
            Generation failed. Check ComfyUI and workflow settings.
          </p>
        )}
        <p className="text-center text-[10px] leading-4 text-neutral-600">
          Only the selected region is regenerated. Review before exporting.
        </p>
      </div>
    </aside>
  );
}

export function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [connected, setConnected] = useState(false);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("original");
  const video = useRef<HTMLVideoElement>(null);
  const bootstrapStarted = useRef(false);
  const persistedSnapshot = useRef("");
  const take = project?.takes[0] ?? null;

  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;
    Promise.all([api<Project[]>("/api/projects"), api<{ comfy: boolean }>("/api/health")])
      .then(async ([projects, health]) => {
        setConnected(health.comfy);
        const loaded =
          projects[0] ??
          (await api<Project>("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Untitled scene" }),
          }));
        persistedSnapshot.current = JSON.stringify(loaded);
        setProject(loaded);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!project) return;
    const snapshot = JSON.stringify(project);
    if (snapshot === persistedSnapshot.current) return;
    const timeout = setTimeout(() => {
      persistedSnapshot.current = snapshot;
      api<Project>(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: snapshot,
      }).catch(() => {
        persistedSnapshot.current = "";
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [project]);
  useEffect(() => {
    if (!project) return;
    const needsSync = project.takes.some(
      (item) =>
        item.status === "queued" ||
        item.status === "running" ||
        item.status === "stitching" ||
        (!item.generations?.length && item.status === "complete"),
    );
    if (!needsSync) return;
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        const next = await api<Project>(`/api/projects/${project.id}/sync`, { method: "POST" });
        if (cancelled) return;
        persistedSnapshot.current = JSON.stringify(next);
        setProject(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not update generation status");
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [project]);

  const updateTake = (patch: Partial<Take>) =>
    setProject((p) =>
      p ? { ...p, takes: p.takes.map((t, i) => (i ? t : { ...t, ...patch })) } : p,
    );
  const upload = async (file: File) => {
    if (!project) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("video", file);
      const next = await api<Project>(`/api/projects/${project.id}/video`, {
        method: "POST",
        body: form,
      });
      persistedSnapshot.current = JSON.stringify(next);
      startTransition(() => {
        setProject(next);
        setCurrent(0);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };
  const addTake = () =>
    setProject((p) =>
      p
        ? {
            ...p,
            takes: [
              {
                id: crypto.randomUUID(),
                start: current,
                end: Math.min(current + 5, p.video?.duration || 5),
                text: "",
                speaker: "On-screen speaker",
                status: "draft",
              },
            ],
          }
        : p,
    );
  const generate = async () => {
    if (!project || !take) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ take: Take; generation: Generation }>(`/api/projects/${project.id}/takes/${take.id}/generate`, {
        method: "POST",
      });
      updateTake(result.take);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      updateTake({ status: "failed" });
    } finally {
      setBusy(false);
    }
  };
  const seek = (n: number) => {
    setCurrent(n);
    if (video.current) video.current.currentTime = n;
  };
  const toggle = () => {
    if (!video.current) return;
    if (video.current.paused) video.current.play();
    else video.current.pause();
  };
  const selectedGeneration = take?.generations?.find((generation) => activeView.endsWith(generation.id));
  const activeVideoUrl =
    activeView.startsWith("segment:")
      ? selectedGeneration?.segmentUrl
      : activeView.startsWith("full:")
        ? selectedGeneration?.stitchedUrl
        : project?.video?.url;

  return (
    <main className="grid-texture flex h-dvh min-h-[640px] flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0b0d]/90 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <button className="grid size-9 place-items-center rounded-lg bg-lime-300 text-neutral-950">
            <Film size={19} strokeWidth={2.5} />
          </button>
          <div className="hidden sm:block">
            <div className="display text-sm font-bold tracking-tight">RESCRIPT</div>
            <div className="text-[9px] font-bold tracking-[.22em] text-neutral-600">
              VIDEO DIALOGUE LAB
            </div>
          </div>
          <span className="mx-2 hidden h-5 w-px bg-white/10 sm:block" />
          <button className="flex max-w-44 items-center gap-2 truncate text-sm text-neutral-300">
            <span className="truncate">{project?.name || "Loading..."}</span>
            <ChevronDown size={13} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill connected={connected} />
          <Button variant="secondary" size="sm" className="hidden sm:flex">
            <Download size={14} /> Export
          </Button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-50 min-w-44 rounded-lg border border-white/10 bg-[#17191c] p-1 shadow-2xl"
              >
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm outline-none hover:bg-white/10">
                  <Settings2 size={14} /> Settings
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm outline-none hover:bg-white/10">
                  <CircleHelp size={14} /> Help
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-16 shrink-0 flex-col items-center gap-2 border-r border-white/10 bg-[#0b0c0e] py-4 md:flex">
          <Button variant="ghost" size="icon">
            <ArrowLeft size={17} />
          </Button>
          <span className="my-2 h-px w-7 bg-white/10" />
          <Button variant="secondary" size="icon">
            <Film size={17} />
          </Button>
          <Button variant="ghost" size="icon">
            <Volume2 size={17} />
          </Button>
          <Button variant="ghost" size="icon">
            <Cloud size={17} />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon">
            <Settings2 size={17} />
          </Button>
        </nav>
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 bg-black/25 p-4 md:p-7">
            {project?.video ? (
              <div className="relative mx-auto h-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
                <video
                  key={activeVideoUrl}
                  ref={video}
                  src={activeVideoUrl || project.video.url}
                  className="h-full w-full object-contain"
                  onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onClick={toggle}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
                <Button
                  onClick={toggle}
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-4 left-4 rounded-full bg-black/50 backdrop-blur"
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </Button>
                {!take && (
                  <Button onClick={addTake} className="absolute bottom-4 right-4">
                    <Plus size={16} /> Replace dialogue
                  </Button>
                )}
              </div>
            ) : (
              <EmptyVideo onUpload={upload} busy={busy} />
            )}
            {error && (
              <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-red-400/20 bg-red-950/90 px-4 py-3 text-sm text-red-200 shadow-xl">
                <span>{error}</span>
                <button onClick={() => setError("")}>
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          <Timeline
            duration={project?.video?.duration || 12}
            current={current}
            take={take}
            onSeek={seek}
            onRange={(start, end) => updateTake({ start, end })}
          />
        </section>
        <TakeEditor
          take={take}
          onChange={updateTake}
          onGenerate={generate}
          onDelete={() => setProject((p) => (p ? { ...p, takes: [] } : p))}
          activeView={activeView}
          onSelectView={(view) => {
            setActiveView(view);
            setCurrent(0);
          }}
          busy={busy}
        />
      </div>
    </main>
  );
}
