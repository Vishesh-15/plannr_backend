import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(d) {
  if (!d) return "";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateISO, days) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function startOfWeekISO(dateISO) {
  const d = new Date(dateISO);
  const day = d.getDay(); // 0 Sun - 6 Sat
  const diff = (day + 6) % 7; // week starts Monday
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function weekDates(startISO) {
  return Array.from({ length: 7 }, (_, i) => addDays(startISO, i));
}

export function daysUntil(dateISO) {
  if (!dateISO) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateISO);
  target.setHours(0, 0, 0, 0);
  const ms = target - now;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
