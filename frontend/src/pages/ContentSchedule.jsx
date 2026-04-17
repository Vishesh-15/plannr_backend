import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { tasksApi, platformsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Settings2, Trash2, X } from "lucide-react";
import TaskDialog from "@/components/TaskDialog";
import TaskRow from "@/components/TaskRow";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const COLORS = ["#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#3B82F6", "#10B981"];
const SUGGESTIONS = ["YouTube", "Instagram", "TikTok", "X/Twitter", "LinkedIn", "Threads", "Blog", "Newsletter", "Podcast"];

export default function ContentSchedule() {
  const [tasks, setTasks] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [platform, setPlatform] = useState("all");
  const [taskOpen, setTaskOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [newPlat, setNewPlat] = useState({ name: "", color: COLORS[0] });

  const load = async () => {
    const [tList, pList] = await Promise.all([tasksApi.list(), platformsApi.list()]);
    setTasks(tList.filter((t) => t.platform));
    setPlatforms(pList);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => (platform === "all" ? tasks : tasks.filter((t) => t.platform === platform)),
    [tasks, platform]
  );

  const submit = async (p) => {
    if (!p.platform) {
      toast.error("Choose a platform");
      throw new Error("no platform");
    }
    if (editing) await tasksApi.update(editing.task_id, p);
    else await tasksApi.create(p);
    toast.success(editing ? "Updated" : "Scheduled");
    load();
  };
  const toggle = async (t) => { await tasksApi.update(t.task_id, { status: t.status === "done" ? "pending" : "done" }); load(); };
  const remove = async (t) => { await tasksApi.remove(t.task_id); toast.success("Removed"); load(); };

  const addPlatform = async (name, color) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return toast.error("Name required");
    try {
      await platformsApi.create({ name: trimmed, color: color || COLORS[0] });
      toast.success(`${trimmed} added`);
      setNewPlat({ name: "", color: COLORS[0] });
      load();
    } catch (e) {
      if (e?.response?.status === 409) toast.error("Already exists");
      else toast.error("Could not add");
    }
  };
  const removePlatform = async (p) => {
    await platformsApi.remove(p.platform_id);
    toast.success(`${p.name} removed`);
    if (platform === p.name) setPlatform("all");
    load();
  };

  const platformColor = (name) => platforms.find((p) => p.name === name)?.color || "#F59E0B";

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="label-xs mb-2">Creator</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Content schedule</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setManageOpen(true)} data-testid="content-manage-platforms" className="gap-2">
            <Settings2 className="size-4" /> Platforms
          </Button>
          <Button onClick={() => { setEditing(null); setTaskOpen(true); }} className="gap-2" data-testid="content-new"><Plus className="size-4" /> Schedule post</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-8">
        <TabPill active={platform === "all"} onClick={() => setPlatform("all")} testid="platform-all">
          All
        </TabPill>
        {platforms.map((p) => (
          <TabPill
            key={p.platform_id}
            active={platform === p.name}
            onClick={() => setPlatform(p.name)}
            color={p.color}
            testid={`platform-${p.name}`}
          >
            {p.name}
          </TabPill>
        ))}
        {platforms.length === 0 && (
          <button
            onClick={() => setManageOpen(true)}
            className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded-full px-3 py-1.5"
            data-testid="content-add-first-platform"
          >
            + Add your first platform
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-16 text-center border border-dashed border-border rounded-md">
          {platforms.length === 0 ? "Add platforms to start scheduling posts." : "No scheduled content for this platform."}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => (
            <div key={t.task_id} className="flex items-center gap-3">
              <TaskRow task={t} onToggle={toggle} onEdit={(x) => { setEditing(x); setTaskOpen(true); }} onDelete={remove} />
              <span
                className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                style={{ background: `${platformColor(t.platform)}1A`, color: platformColor(t.platform) }}
              >
                <span className="size-1.5 rounded-full" style={{ background: platformColor(t.platform) }} />
                {t.platform}
              </span>
            </div>
          ))}
        </div>
      )}

      <TaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        onSubmit={submit}
        initial={editing || { platform: platform !== "all" ? platform : "" }}
        platforms={platforms}
      />

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-[520px]" data-testid="platforms-dialog">
          <DialogHeader>
            <DialogTitle>Manage platforms</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label>Your platforms</Label>
              {platforms.length === 0 ? (
                <div className="text-xs text-muted-foreground border border-dashed border-border rounded-md p-3">
                  No platforms yet. Add the ones you actually post to.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {platforms.map((p) => (
                    <span
                      key={p.platform_id}
                      className="group inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full border border-border"
                      data-testid={`platform-chip-${p.name}`}
                    >
                      <span className="size-2 rounded-full" style={{ background: p.color }} />
                      <span className="text-sm">{p.name}</span>
                      <button
                        onClick={() => removePlatform(p)}
                        className="size-5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                        data-testid={`platform-remove-${p.name}`}
                        aria-label={`Remove ${p.name}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Add platform</Label>
              <div className="flex gap-2">
                <Input
                  value={newPlat.name}
                  onChange={(e) => setNewPlat({ ...newPlat, name: e.target.value })}
                  placeholder="e.g. Substack"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addPlatform(newPlat.name, newPlat.color); }
                  }}
                  data-testid="platform-input"
                />
                <Button onClick={() => addPlatform(newPlat.name, newPlat.color)} data-testid="platform-add">Add</Button>
              </div>
              <div className="flex gap-2 mt-1">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setNewPlat({ ...newPlat, color: c })}
                    className={`size-5 rounded-full border-2 transition-all ${newPlat.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ background: c }}
                    aria-label={`color ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Quick add</Label>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.filter((s) => !platforms.some((p) => p.name.toLowerCase() === s.toLowerCase())).map((s) => (
                  <button
                    key={s}
                    onClick={() => addPlatform(s, newPlat.color)}
                    className="text-xs px-3 py-1 rounded-full border border-border hover:bg-accent transition-colors"
                    data-testid={`platform-suggest-${s}`}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManageOpen(false)} data-testid="platforms-close">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function TabPill({ active, onClick, children, color, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-all",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
      )}
    >
      {color && <span className="size-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}
