import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { tasksApi, subjectsApi, clientsApi, examsApi, paymentsApi, ideasApi, timeLogsApi, statsApi, platformsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Calendar, CheckCircle2, Clock3, AlertCircle, GraduationCap, Users, Film, BookOpen, Timer, Receipt, Lightbulb, CalendarRange } from "lucide-react";
import TaskDialog from "@/components/TaskDialog";
import TaskRow from "@/components/TaskRow";
import { todayISO, addDays, daysUntil, formatDate } from "@/lib/utils";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const accentClass = { student: "bg-emerald-500", freelancer: "bg-blue-500", creator: "bg-amber-500" };
const accentText = { student: "text-emerald-500", freelancer: "text-blue-500", creator: "text-amber-500" };

export default function Dashboard() {
  const { user } = useAuth();
  const pt = user?.profile_type;
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [exams, setExams] = useState([]);
  const [payments, setPayments] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [logs, setLogs] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [stats, setStats] = useState({ total: 0, done: 0, today: 0, pending: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const today = todayISO();
  const weekEnd = addDays(today, 6);

  const load = async () => {
    const [t, st] = await Promise.all([
      tasksApi.list({ date_from: today, date_to: weekEnd }),
      statsApi.get(),
    ]);
    setTasks(t);
    setStats(st);
    if (pt === "student") {
      const [s, e] = await Promise.all([subjectsApi.list(), examsApi.list()]);
      setSubjects(s); setExams(e);
    } else if (pt === "freelancer") {
      const [c, p, l] = await Promise.all([clientsApi.list(), paymentsApi.list(), timeLogsApi.list({ date_from: addDays(today, -6), date_to: today })]);
      setClients(c); setPayments(p); setLogs(l);
    } else if (pt === "creator") {
      const [i, p] = await Promise.all([ideasApi.list(), platformsApi.list()]);
      setIdeas(i);
      setPlatforms(p);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [pt]);

  const todayTasks = useMemo(() => tasks.filter((t) => t.date === today), [tasks, today]);
  const upcomingTasks = useMemo(() => tasks.filter((t) => t.date && t.date > today).slice(0, 6), [tasks, today]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (t) => { setEditing(t); setDialogOpen(true); };
  const submitTask = async (payload) => {
    if (editing) {
      await tasksApi.update(editing.task_id, payload);
      toast.success("Task updated");
    } else {
      await tasksApi.create(payload);
      toast.success("Task created");
    }
    await load();
  };
  const toggle = async (t) => {
    const next = t.status === "done" ? "pending" : "done";
    await tasksApi.update(t.task_id, { status: next });
    await load();
  };
  const remove = async (t) => {
    await tasksApi.remove(t.task_id);
    toast.success("Task removed");
    await load();
  };

  const totalWeekMinutes = useMemo(() => logs.reduce((s, l) => s + (l.minutes || 0), 0), [logs]);

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4 mb-10">
        <div className="stagger-in stagger-in-1">
          <div className={cn("label-xs mb-2 flex items-center gap-2")}>
            <span className={cn("size-1.5 rounded-full", pt && accentClass[pt])} />
            {pt === "student" && "Student workspace"}
            {pt === "freelancer" && "Freelancer workspace"}
            {pt === "creator" && "Creator workspace"}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight" data-testid="dashboard-heading">
            Good {greet()}, {user?.name?.split(" ")[0] || "there"}.
          </h1>
          <p className="text-muted-foreground mt-2 text-sm font-mono">{formatDate(today)}</p>
        </div>
        <Button size="lg" onClick={openNew} data-testid="dashboard-new-task" className="gap-2 shrink-0">
          <Plus className="size-4" strokeWidth={1.5} /> New task
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden mb-10">
        <Stat icon={Calendar} label="Today" value={stats.today} />
        <Stat icon={Clock3} label="Pending" value={stats.pending} />
        <Stat icon={CheckCircle2} label="Completed" value={stats.done} />
        <Stat icon={TrendingUp} label="All time" value={stats.total} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 border border-border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Today · {formatDate(today)}</h2>
            <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground font-mono uppercase tracking-wider">All tasks →</Link>
          </div>
          {todayTasks.length === 0 ? (
            <EmptyState label="Nothing today. Add a task to get going." />
          ) : (
            <div className="flex flex-col gap-2">
              {todayTasks.map((t) => (
                <TaskRow key={t.task_id} task={t} onToggle={toggle} onEdit={openEdit} onDelete={remove} accent={pt ? accentClass[pt] : null} />
              ))}
            </div>
          )}

          <h3 className="font-display text-sm font-semibold mt-8 mb-3 label-xs">Upcoming · this week</h3>
          {upcomingTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground">No upcoming tasks in the next 6 days.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingTasks.map((t) => (
                <TaskRow key={t.task_id} task={t} onToggle={toggle} onEdit={openEdit} onDelete={remove} accent={pt ? accentClass[pt] : null} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          {pt === "student" && (
            <StudentWidgets exams={exams} subjects={subjects} />
          )}
          {pt === "freelancer" && (
            <FreelancerWidgets clients={clients} payments={payments} minutes={totalWeekMinutes} />
          )}
          {pt === "creator" && (
            <CreatorWidgets ideas={ideas} tasks={tasks} />
          )}
        </aside>
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={submitTask}
        initial={editing}
        subjects={subjects}
        clients={clients}
        exams={exams}
        platforms={platforms}
      />
    </AppShell>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-card p-5 flex items-center gap-4">
      <Icon className="size-5 text-muted-foreground" strokeWidth={1.5} />
      <div>
        <div className="label-xs">{label}</div>
        <div className="font-display text-2xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-md">{label}</div>;
}

function StudentWidgets({ exams, subjects }) {
  const nextExam = exams?.[0];
  const d = nextExam ? daysUntil(nextExam.date) : null;
  return (
    <>
      <Widget title="Next exam" icon={GraduationCap} accent="text-emerald-500" testid="widget-exam">
        {nextExam ? (
          <div>
            <div className="font-display text-3xl font-semibold">{d} <span className="text-sm text-muted-foreground font-mono">days</span></div>
            <div className="mt-2 text-sm">{nextExam.name}</div>
            <div className="text-xs text-muted-foreground font-mono">{formatDate(nextExam.date)}</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No upcoming exams. <Link to="/student/exams" className="underline underline-offset-4">Add one</Link>.</div>
        )}
      </Widget>
      <Widget title="Subjects" icon={BookOpen} accent="text-emerald-500" testid="widget-subjects">
        {subjects?.length ? (
          <ul className="space-y-1.5">
            {subjects.slice(0, 5).map((s) => (
              <li key={s.subject_id} className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full" style={{ background: s.color }} /> {s.name}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-muted-foreground">No subjects yet. <Link to="/student/subjects" className="underline underline-offset-4">Create</Link>.</div>
        )}
      </Widget>
    </>
  );
}

function FreelancerWidgets({ clients, payments, minutes }) {
  const hoursThisWeek = (minutes / 60).toFixed(1);
  const duePayments = payments.filter((p) => p.status === "pending");
  return (
    <>
      <Widget title="Hours · this week" icon={Timer} accent="text-blue-500" testid="widget-hours">
        <div className="font-display text-3xl font-semibold">{hoursThisWeek}<span className="text-sm text-muted-foreground font-mono ml-1">h</span></div>
        <Link to="/freelancer/time" className="mt-2 inline-block text-xs text-muted-foreground hover:text-foreground font-mono uppercase tracking-wider">Log time →</Link>
      </Widget>
      <Widget title="Clients" icon={Users} accent="text-blue-500" testid="widget-clients">
        {clients.length ? (
          <ul className="space-y-1.5">
            {clients.slice(0, 5).map((c) => (
              <li key={c.client_id} className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full" style={{ background: c.color }} /> {c.name}
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-muted-foreground">No clients. <Link to="/freelancer/clients" className="underline underline-offset-4">Add</Link>.</div>}
      </Widget>
      <Widget title="Payments due" icon={Receipt} accent="text-blue-500" testid="widget-payments">
        {duePayments.length ? (
          <ul className="space-y-2">
            {duePayments.slice(0, 4).map((p) => (
              <li key={p.payment_id} className="flex items-center justify-between text-sm">
                <span className="truncate">{p.title}</span>
                <span className="font-mono text-xs text-muted-foreground">{p.currency} {p.amount}</span>
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-muted-foreground">All clear.</div>}
      </Widget>
    </>
  );
}

function CreatorWidgets({ ideas, tasks }) {
  const nextPost = tasks.find((t) => t.platform && t.status !== "done");
  const d = nextPost ? daysUntil(nextPost.date) : null;
  return (
    <>
      <Widget title="Next upload" icon={CalendarRange} accent="text-amber-500" testid="widget-upload">
        {nextPost ? (
          <>
            <div className="font-display text-3xl font-semibold">{d} <span className="text-sm text-muted-foreground font-mono">days</span></div>
            <div className="mt-2 text-sm truncate">{nextPost.title}</div>
            <div className="text-xs text-muted-foreground font-mono uppercase">{nextPost.platform}</div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">No scheduled posts. <Link to="/creator/content" className="underline underline-offset-4">Schedule</Link>.</div>
        )}
      </Widget>
      <Widget title="Idea bank" icon={Lightbulb} accent="text-amber-500" testid="widget-ideas">
        {ideas.length ? (
          <ul className="space-y-1.5">
            {ideas.slice(0, 5).map((i) => (
              <li key={i.idea_id} className="text-sm truncate">{i.title}</li>
            ))}
          </ul>
        ) : <div className="text-sm text-muted-foreground">Capture your first idea in <Link to="/creator/ideas" className="underline underline-offset-4">idea bank</Link>.</div>}
      </Widget>
    </>
  );
}

function Widget({ title, icon: Icon, accent, children, testid }) {
  return (
    <div className="border border-border rounded-lg p-6 bg-card" data-testid={testid}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={cn("size-4", accent)} strokeWidth={1.5} />
        <span className="label-xs">{title}</span>
      </div>
      {children}
    </div>
  );
}
