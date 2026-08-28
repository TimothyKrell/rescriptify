import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export type { Generation, Project, Take } from "../shared/types";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatTime(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  const frames = Math.floor((value % 1) * 24);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}
