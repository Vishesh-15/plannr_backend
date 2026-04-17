import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { tasksApi, subjectsApi, clientsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import TaskDialog from "@/components/TaskDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDays, startOfWeekISO, todayISO, weekDates, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const accentClass = { student: "bg-emerald-500", freelancer: "bg-blue-500", creator: "bg-amber-500" };

export default function CalendarView() {
  const { user } = useAuth();
  const pt = user?.profile_type;
  const [view, setView] = useState("week");
  const [anchor, setAnchor] = useState(todayISO());
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState(null);

  const start = view === "week" ? startOfWeekISO(anchor) : anchor;
  const end = view === "week" ? addDays(start, 6) : anchor;
  const days = view === "week" ? weekDates(start) : [anchor];

  const load = async () => {
    const t = await tasksApi.list({ date_from: start, date_to: end });
    setTasks(t);
    if (pt === "student") setSubjects(await subjectsApi.list());
    if (pt === "freelancer") setClients(await clientsApi.list());
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [anchor, view, pt]);

  const byDay = useMemo(() => {
    const m = {};
    for (const d of days) m[d] = [];
    for (const t of tasks) if (m[t.date]) m[t.date].push(t);
    return m;
  }, [tasks, days]);

  const shift = (d) => setAnchor(addDays(anchor, view === "week" ? d * 7 : d));

  const newOn = (date) => { setInitial({ date }); setOpen(true); };
  const submit = async (p) => { await tasksApi.create(p); toast.success("Task created"); load(); };

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="label-xs mb-2">Calendar</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {view === "week" ? `Week of ${formatDate(start)}` : formatDate(anchor)}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="day" data-testid="cal-day">Day</TabsTrigger>
              <TabsTrigger value="week" data-testid="cal-week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={() => shift(-1)} data-testid="cal-prev"><ChevronLeft className="size-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setAnchor(todayISO())} data-testid="cal-today">Today</Button>
            <Button size="icon" variant="outline" onClick={() => shift(1)} data-testid="cal-next"><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </div>

      <div className={cn("grid gap-px bg-border border border-border rounded-lg overflow-hidden", view === "week" ? "grid-cols-1 md:grid-cols-7" : "grid-cols-1")}>
        {days.map((d) => {
          const isToday = d === todayISO();
          const items = byDay[d] || [];
          return (
            <div key={d} className={cn("bg-card p-4 min-h-[260px]", isToday && "ring-1 ring-inset ring-foreground/20")}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className={cn("label-xs", isToday && "text-foreground")}>
                    {new Date(d).toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                  <div className="font-display text-lg font-semibold mt-0.5">
                    {new Date(d).getDate()}
                  </div>
                </div>
                <button onClick={() => newOn(d)} className="text-muted-foreground hover:text-foreground transition-colors" data-testid={`cal-add-${d}`}>
                  <Plus className="size-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {items.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground font-mono">—</div>
                ) : items.map((t) => (
                  <div
                    key={t.task_id}
                    className={cn("px-2 py-1.5 text-xs rounded border border-border bg-background", t.status === "done" && "line-through text-muted-foreground")}
                    data-testid={`cal-task-${t.task_id}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {pt && <span className={cn("size-1 rounded-full", accentClass[pt])} />}
                      {t.time && <span className="font-mono text-[10px] text-muted-foreground">{t.time}</span>}
                    </div>
                    <div className="font-medium leading-tight mt-0.5 truncate">{t.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <TaskDialog open={open} onOpenChange={setOpen} onSubmit={submit} initial={initial} subjects={subjects} clients={clients} />
    </AppShell>
  );
}
