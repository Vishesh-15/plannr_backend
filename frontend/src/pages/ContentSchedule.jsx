import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { tasksApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TaskDialog from "@/components/TaskDialog";
import TaskRow from "@/components/TaskRow";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PLATFORMS = ["all", "youtube", "instagram", "tiktok", "twitter", "linkedin", "blog"];

export default function ContentSchedule() {
  const [tasks, setTasks] = useState([]);
  const [platform, setPlatform] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const list = await tasksApi.list();
    setTasks(list.filter((t) => t.platform));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => platform === "all" ? tasks : tasks.filter((t) => t.platform === platform), [tasks, platform]);

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

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="label-xs mb-2">Creator</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Content schedule</h1>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2" data-testid="content-new"><Plus className="size-4" /> Schedule post</Button>
      </div>

      <Tabs value={platform} onValueChange={setPlatform} className="mb-6">
        <TabsList className="flex-wrap">
          {PLATFORMS.map((p) => (
            <TabsTrigger key={p} value={p} data-testid={`platform-${p}`}>{p}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-16 text-center border border-dashed border-border rounded-md">
          No scheduled content for this platform.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => (
            <TaskRow key={t.task_id} task={t} onToggle={toggle} onEdit={(x) => { setEditing(x); setOpen(true); }} onDelete={remove} accent="bg-amber-500" />
          ))}
        </div>
      )}

      <TaskDialog open={open} onOpenChange={setOpen} onSubmit={submit} initial={editing || { platform: platform !== "all" ? platform : "" }} />
    </AppShell>
  );
}
