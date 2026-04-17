import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { examsApi, subjectsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { daysUntil, formatDate, todayISO } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", subject_id: "", date: todayISO(), notes: "" });

  const load = async () => {
    setExams(await examsApi.list());
    setSubjects(await subjectsApi.list());
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name required");
    await examsApi.create({ ...form, subject_id: form.subject_id || null });
    setForm({ name: "", subject_id: "", date: todayISO(), notes: "" });
    setOpen(false);
    toast.success("Exam added");
    load();
  };
  const remove = async (id) => { await examsApi.remove(id); toast.success("Removed"); load(); };

  const subjectName = (id) => subjects.find((s) => s.subject_id === id)?.name;

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
            return (
              <div key={e.exam_id} className="group border border-border rounded-lg p-6 bg-card" data-testid={`exam-${e.exam_id}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="label-xs text-emerald-500">{subjectName(e.subject_id) || "—"}</div>
                    <div className="font-display text-xl font-semibold mt-1">{e.name}</div>
                    <div className="text-xs font-mono text-muted-foreground mt-1">{formatDate(e.date)}</div>
                  </div>
                  <div className="text-right">
                    <div className={cn("font-display text-3xl font-semibold", urgent ? "text-rose-500" : "")}>
                      {d >= 0 ? d : 0}
                    </div>
                    <div className="label-xs">days</div>
                  </div>
                </div>
                {e.notes && <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{e.notes}</p>}
                <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" onClick={() => remove(e.exam_id)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New exam</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus data-testid="exam-name" /></div>
            <div className="grid gap-2">
              <Label>Subject</Label>
              <Select value={form.subject_id || "none"} onValueChange={(v) => setForm({ ...form, subject_id: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="exam-subject"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subjects.map((s) => (<SelectItem key={s.subject_id} value={s.subject_id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
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
