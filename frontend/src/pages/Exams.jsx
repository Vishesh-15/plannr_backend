import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { examsApi, subjectsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { daysUntil, formatDate, todayISO } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", subject_ids: [], date: todayISO(), notes: "" });

  const load = async () => {
    setExams(await examsApi.list());
    setSubjects(await subjectsApi.list());
  };
  useEffect(() => { load(); }, []);

  const toggleSubject = (id) => {
    setForm((f) => ({
      ...f,
      subject_ids: f.subject_ids.includes(id) ? f.subject_ids.filter((x) => x !== id) : [...f.subject_ids, id],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name required");
    await examsApi.create({ ...form });
    setForm({ name: "", subject_ids: [], date: todayISO(), notes: "" });
    setOpen(false);
    toast.success("Exam added");
    load();
  };
  const remove = async (id) => { await examsApi.remove(id); toast.success("Removed"); load(); };

  const getSubject = (id) => subjects.find((s) => s.subject_id === id);
  const examSubjects = (exam) => {
    const ids = exam.subject_ids && exam.subject_ids.length ? exam.subject_ids : (exam.subject_id ? [exam.subject_id] : []);
    return ids.map(getSubject).filter(Boolean);
  };

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="label-xs mb-2">Student</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Exams</h1>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="exam-new" className="gap-2"><Plus className="size-4" /> New exam</Button>
      </div>

      {exams.length === 0 ? (
        <div className="text-sm text-muted-foreground py-16 text-center border border-dashed border-border rounded-md">No exams scheduled.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((e) => {
            const d = daysUntil(e.date);
            const urgent = d !== null && d <= 7 && d >= 0;
            const subs = examSubjects(e);
            return (
              <div key={e.exam_id} className="group border border-border rounded-lg p-6 bg-card" data-testid={`exam-${e.exam_id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {subs.length === 0 ? (
                        <span className="label-xs">—</span>
                      ) : subs.map((s) => (
                        <span key={s.subject_id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: `${s.color}1A`, color: s.color }}>
                          <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                          {s.name}
                        </span>
                      ))}
                    </div>
                    <div className="font-display text-xl font-semibold">{e.name}</div>
                    <div className="text-xs font-mono text-muted-foreground mt-1">{formatDate(e.date)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn("font-display text-3xl font-semibold", urgent ? "text-rose-500" : "")}>
                      {d >= 0 ? d : 0}
                    </div>
                    <div className="label-xs">days</div>
                  </div>
                </div>
                {e.notes && <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{e.notes}</p>}
                <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" onClick={() => remove(e.exam_id)} data-testid={`exam-del-${e.exam_id}`}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New exam</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus data-testid="exam-name" /></div>

            <div className="grid gap-2">
              <Label>Subjects <span className="text-muted-foreground font-normal">(select one or more)</span></Label>
              {subjects.length === 0 ? (
                <div className="text-xs text-muted-foreground border border-dashed border-border rounded-md p-3">
                  No subjects yet. Add subjects first from the Subjects page.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-border rounded-md p-3 max-h-48 overflow-y-auto">
                  {subjects.map((s) => {
                    const checked = form.subject_ids.includes(s.subject_id);
                    return (
                      <label
                        key={s.subject_id}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent/60 transition-colors",
                          checked && "bg-accent"
                        )}
                        data-testid={`exam-subject-${s.subject_id}`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleSubject(s.subject_id)} />
                        <span className="size-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-sm truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {form.subject_ids.length > 0 && (
                <div className="text-[11px] font-mono text-muted-foreground">
                  {form.subject_ids.length} selected
                </div>
              )}
            </div>

            <div className="grid gap-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="exam-date" /></div>
            <div className="grid gap-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" data-testid="exam-submit">Add</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
