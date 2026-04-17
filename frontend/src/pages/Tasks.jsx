import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { tasksApi, subjectsApi, clientsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import TaskDialog from "@/components/TaskDialog";
import TaskRow from "@/components/TaskRow";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const accentClass = { student: "bg-emerald-500", freelancer: "bg-blue-500", creator: "bg-amber-500" };

export default function Tasks() {
  const { user } = useAuth();
  const pt = user?.profile_type;
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState("all");

  const load = async () => {
    const t = await tasksApi.list();
    setTasks(t);
    if (pt === "student") setSubjects(await subjectsApi.list());
    if (pt === "freelancer") setClients(await clientsApi.list());
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [pt]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (tab === "pending") list = list.filter((t) => t.status !== "done");
    else if (tab === "done") list = list.filter((t) => t.status === "done");
    if (q) list = list.filter((t) => (t.title || "").toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [tasks, tab, q]);

  const groups = useMemo(() => {
    const map = {};
    for (const t of filtered) {
      const k = t.date || "Undated";
      (map[k] = map[k] || []).push(t);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (t) => { setEditing(t); setOpen(true); };
  const submit = async (p) => {
    if (editing) await tasksApi.update(editing.task_id, p);
    else await tasksApi.create(p);
    toast.success(editing ? "Task updated" : "Task created");
    await load();
  };
  const toggle = async (t) => { await tasksApi.update(t.task_id, { status: t.status === "done" ? "pending" : "done" }); load(); };
  const remove = async (t) => { await tasksApi.remove(t.task_id); toast.success("Task removed"); load(); };

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="label-xs mb-2">All tasks</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Tasks</h1>
        </div>
        <Button size="lg" onClick={openNew} data-testid="tasks-new" className="gap-2"><Plus className="size-4" strokeWidth={1.5} /> New task</Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="pl-9" data-testid="tasks-search" />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
            <TabsTrigger value="done" data-testid="tab-done">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {groups.length === 0 ? (
        <div className="text-sm text-muted-foreground py-16 text-center border border-dashed border-border rounded-md">
          No tasks. Add your first.
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([date, items]) => (
            <div key={date}>
              <div className="label-xs mb-3">{date}</div>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <TaskRow key={t.task_id} task={t} onToggle={toggle} onEdit={openEdit} onDelete={remove} accent={pt ? accentClass[pt] : null} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskDialog open={open} onOpenChange={setOpen} onSubmit={submit} initial={editing} subjects={subjects} clients={clients} />
    </AppShell>
  );
}
