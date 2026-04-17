import React, { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { clientsApi, timeLogsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Plus, Trash2, Timer as TimerIcon } from "lucide-react";
import { toast } from "sonner";
import { todayISO, formatDate } from "@/lib/utils";

export default function TimeTracker() {
  const [clients, setClients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const startedRef = useRef(null);
  const tickRef = useRef(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ minutes: "", date: todayISO(), client_id: "", description: "" });

  const load = async () => {
    setClients(await clientsApi.list());
    setLogs(await timeLogsApi.list());
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (running) {
      tickRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedRef.current) / 1000));
      }, 500);
    } else if (tickRef.current) {
      clearInterval(tickRef.current);
    }
    return () => tickRef.current && clearInterval(tickRef.current);
  }, [running]);

  const start = () => {
    startedRef.current = Date.now();
    setElapsed(0);
    setRunning(true);
  };
  const stop = async () => {
    setRunning(false);
    const minutes = Math.max(1, Math.round(elapsed / 60));
    await timeLogsApi.create({
      client_id: clientId || null,
      description: description || null,
      date: todayISO(),
      minutes,
    });
    toast.success(`Logged ${minutes} min`);
    setElapsed(0);
    setDescription("");
    load();
  };

  const totalMinutes = useMemo(() => logs.reduce((s, l) => s + (l.minutes || 0), 0), [logs]);
  const hhmmss = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const submitManual = async (e) => {
    e.preventDefault();
    const mins = Number(manual.minutes);
    if (!mins) return toast.error("Minutes required");
    await timeLogsApi.create({
      minutes: mins,
      date: manual.date,
      client_id: manual.client_id || null,
      description: manual.description || null,
    });
    setManual({ minutes: "", date: todayISO(), client_id: "", description: "" });
    setManualOpen(false);
    toast.success("Time logged");
    load();
  };

  const remove = async (id) => { await timeLogsApi.remove(id); toast.success("Removed"); load(); };

  const clientName = (id) => clients.find((c) => c.client_id === id)?.name || "—";

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="label-xs mb-2">Freelancer</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Time tracker</h1>
        </div>
        <Button variant="outline" onClick={() => setManualOpen(true)} data-testid="time-manual" className="gap-2"><Plus className="size-4" /> Manual entry</Button>
      </div>

      <div className="border border-border rounded-lg p-8 bg-card mb-10" data-testid="time-panel">
        <div className="flex items-center gap-3 mb-4">
          <TimerIcon className="size-5 text-blue-500" strokeWidth={1.5} />
          <div className="label-xs">Active timer</div>
        </div>
        <div className="font-mono text-5xl sm:text-6xl font-semibold tracking-tight mb-6">{hhmmss(elapsed)}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : v)}>
            <SelectTrigger data-testid="time-client"><SelectValue placeholder="Client (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No client</SelectItem>
              {clients.map((c) => (<SelectItem key={c.client_id} value={c.client_id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input placeholder="What are you working on?" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="time-desc" />
        </div>
        <div className="flex items-center gap-3">
          {!running ? (
            <Button size="lg" onClick={start} className="gap-2" data-testid="time-start"><Play className="size-4" /> Start</Button>
          ) : (
            <Button size="lg" variant="destructive" onClick={stop} className="gap-2" data-testid="time-stop"><Pause className="size-4" /> Stop & save</Button>
          )}
          <div className="text-xs text-muted-foreground font-mono">Total logged: {(totalMinutes / 60).toFixed(1)}h</div>
        </div>
      </div>

      <h2 className="font-display text-xl font-semibold mb-4">Recent entries</h2>
      {logs.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-md">No entries yet.</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {logs.map((l) => (
            <div key={l.log_id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0 group" data-testid={`log-${l.log_id}`}>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{l.description || "—"}</div>
                <div className="text-xs text-muted-foreground font-mono">{formatDate(l.date)} · {clientName(l.client_id)}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-mono text-sm">{(l.minutes / 60).toFixed(2)}h</div>
                <Button size="icon" variant="ghost" onClick={() => remove(l.log_id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setManualOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitManual} className="bg-card border border-border rounded-lg p-6 w-full max-w-md grid gap-4">
            <h3 className="font-display text-lg font-semibold">Manual time entry</h3>
            <div className="grid gap-2"><Label>Minutes</Label><Input type="number" min="1" value={manual.minutes} onChange={(e) => setManual({ ...manual, minutes: e.target.value })} autoFocus data-testid="manual-minutes" /></div>
            <div className="grid gap-2"><Label>Date</Label><Input type="date" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>Client</Label>
              <Select value={manual.client_id || "none"} onValueChange={(v) => setManual({ ...manual, client_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clients.map((c) => (<SelectItem key={c.client_id} value={c.client_id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Description</Label><Input value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setManualOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="manual-submit">Add</Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
