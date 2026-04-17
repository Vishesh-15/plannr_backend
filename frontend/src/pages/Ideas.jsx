import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { ideasApi, platformsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUSES = ["new", "planned", "published"];

const statusClass = {
  new: "bg-amber-500",
  planned: "bg-blue-500",
  published: "bg-emerald-500",
};

export default function Ideas() {
  const [ideas, setIdeas] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", notes: "", platform: "", status: "new" });

  const load = async () => {
    const [i, p] = await Promise.all([ideasApi.list(), platformsApi.list()]);
    setIdeas(i);
    setPlatforms(p);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title required");
    await ideasApi.create({ ...form, platform: form.platform || null });
    setForm({ title: "", notes: "", platform: "", status: "new" });
    setOpen(false);
    toast.success("Idea saved");
    load();
  };
  const cycleStatus = async (idea) => {
    const next = STATUSES[(STATUSES.indexOf(idea.status) + 1) % STATUSES.length];
    await ideasApi.update(idea.idea_id, { status: next });
    load();
  };
  const remove = async (id) => { await ideasApi.remove(id); toast.success("Removed"); load(); };

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="label-xs mb-2">Creator</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Idea bank</h1>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2" data-testid="idea-new"><Plus className="size-4" /> Capture idea</Button>
      </div>

      {ideas.length === 0 ? (
        <div className="text-sm text-muted-foreground py-16 text-center border border-dashed border-border rounded-md flex flex-col items-center gap-3">
          <Lightbulb className="size-6" strokeWidth={1.5} />
          Capture sparks before they fade.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((i) => (
            <div key={i.idea_id} className="group border border-border rounded-lg p-5 bg-card" data-testid={`idea-${i.idea_id}`}>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => cycleStatus(i)} className="label-xs flex items-center gap-2" data-testid={`idea-status-${i.idea_id}`}>
                  <span className={cn("size-1.5 rounded-full", statusClass[i.status])} />
                  {i.status}
                </button>
                {i.platform && <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{i.platform}</span>}
              </div>
              <div className="font-display text-lg font-semibold leading-snug">{i.title}</div>
              {i.notes && <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-4">{i.notes}</p>}
              <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" onClick={() => remove(i.idea_id)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New idea</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus data-testid="idea-title" /></div>
            <div className="grid gap-2"><Label>Notes</Label><Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Platform</Label>
                <Select value={form.platform || "none"} onValueChange={(v) => setForm({ ...form, platform: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {platforms.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        Add platforms in Content first
                      </SelectItem>
                    ) : platforms.map((p) => (<SelectItem key={p.platform_id} value={p.name}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" data-testid="idea-submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
