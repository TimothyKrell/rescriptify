export type Generation = {
  id: string;
  jobId: string;
  createdAt: string;
  status: "queued" | "running" | "stitching" | "complete" | "failed";
  segmentUrl?: string;
  stitchedUrl?: string;
  error?: string;
};

export type Take = {
  id: string;
  start: number;
  end: number;
  text: string;
  speaker: string;
  status: "draft" | "queued" | "running" | "stitching" | "complete" | "failed";
  prompt?: string;
  outputUrl?: string;
  generations?: Generation[];
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  video?: { url: string; filename: string; duration: number; width: number; height: number };
  takes: Take[];
};
