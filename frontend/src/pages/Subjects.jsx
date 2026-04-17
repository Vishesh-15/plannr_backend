import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { subjectsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const load = async () => setSubjects(await subjectsApi.list());
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await subjectsApi.create({ name, color });
    toast.success("Subject added");
    setName(""); setColor(COLORS[0]); setOpen(false);
    load();
  };
  const remove = async (id) => { await subjectsApi.remove(id); toast.success("Removed"); load(); };

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="label-xs mb-2">Student</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Subjects</h1>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="subject-new" className="gap-2"><Plus className="size-4" /> New subject</Button>
      </div>

      {subjects.length === 0 ? (
        <div className="text-sm text-muted-foreground py-16 text-center border border-dashed border-border rounded-md">No subjects yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <div key={s.subject_id} className="group border border-border rounded-lg p-5 bg-card flex items-center justify-between" data-testid={`subject-${s.subject_id}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="size-3 rounded-full" style={{ background: s.color }} />
                <span className="font-medium truncate">{s.name}</span>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(s.subject_id)} className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`subject-del-${s.subject_id}`}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New subject</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus data-testid="subject-name" />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button type="button" key={c} onClick={() => setColor(c)} className={`size-7 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="subject-submit">Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
