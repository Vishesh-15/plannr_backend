import React, { useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { GraduationCap, Users, Film, Check } from "lucide-react";

export default function Settings() {
  const { user, updateMe } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name || "");
  const [profile, setProfile] = useState(user?.profile_type || "student");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateMe({ name, profile_type: profile, theme });
      toast.success("Settings saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-8">
        <div className="label-xs mb-2">Preferences</div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Settings</h1>
      </div>

      <div className="grid gap-8 max-w-2xl">
        <Section title="Account">
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled data-testid="settings-email" />
          </div>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="settings-name" />
          </div>
        </Section>

        <Section title="Profile type">
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: "student", t: "Student", i: GraduationCap, c: "emerald" },
              { k: "freelancer", t: "Freelancer", i: Users, c: "blue" },
              { k: "creator", t: "Creator", i: Film, c: "amber" },
            ].map((o) => {
              const sel = profile === o.k;
              const Icon = o.i;
              return (
                <button
                  key={o.k}
                  onClick={() => setProfile(o.k)}
                  data-testid={`settings-profile-${o.k}`}
                  className={cn(
                    "p-5 rounded-md border border-border bg-card text-left transition-all hover:-translate-y-[1px]",
                    sel && "ring-2 ring-offset-2 ring-offset-background",
                    sel && o.c === "emerald" && "ring-emerald-500",
                    sel && o.c === "blue" && "ring-blue-500",
                    sel && o.c === "amber" && "ring-amber-500"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Icon className="size-5" strokeWidth={1.5} />
                    {sel && <Check className="size-4" strokeWidth={2} />}
                  </div>
                  <div className="text-sm font-medium">{o.t}</div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Theme">
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger data-testid="settings-theme"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </Section>

        <div className="flex items-center gap-3 pt-2">
          <Button size="lg" onClick={save} disabled={saving} data-testid="settings-save">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }) {
  return (
    <div className="border border-border rounded-lg p-6 bg-card space-y-4">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
