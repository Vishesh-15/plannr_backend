import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GraduationCap, Users, Film, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

const OPTIONS = [
  {
    key: "student",
    title: "Student",
    desc: "Plan study sessions, track subjects, and never miss an exam.",
    icon: GraduationCap,
    accent: "emerald",
    features: ["Study session planner", "Exam countdown", "Subject tracker", "Revision reminders"],
  },
  {
    key: "freelancer",
    title: "Freelancer",
    desc: "Manage clients, log hours, and stay on top of deadlines & invoices.",
    icon: Users,
    accent: "blue",
    features: ["Deadline tracker", "Client kanban", "Work hour logger", "Payment reminders"],
  },
  {
    key: "creator",
    title: "Content Creator",
    desc: "Schedule posts across platforms and capture ideas before they fade.",
    icon: Film,
    accent: "amber",
    features: ["Content calendar", "Platform schedule", "Idea bank", "Upload reminders"],
  },
];

const accentMap = {
  emerald: "ring-emerald-500 text-emerald-500 bg-emerald-500",
  blue: "ring-blue-500 text-blue-500 bg-blue-500",
  amber: "ring-amber-500 text-amber-500 bg-amber-500",
};

export default function Onboarding() {
  const { user, updateMe } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(user?.profile_type || null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateMe({ profile_type: selected });
      toast.success(`Welcome aboard, ${user?.name?.split(" ")[0] || ""}!`);
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("Could not save profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="stagger-in stagger-in-1 label-xs mb-3">Step 1 · Choose your workflow</div>
        <h1 className="stagger-in stagger-in-2 font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-tight max-w-3xl">
          How do you plan to use Plannr?
        </h1>
        <p className="stagger-in stagger-in-3 mt-4 text-muted-foreground max-w-2xl">
          Pick a profile. We'll tailor your dashboard and features. You can switch anytime from settings.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {OPTIONS.map((opt, i) => {
            const isSel = selected === opt.key;
            const Icon = opt.icon;
            const [ring, txt, bg] = accentMap[opt.accent].split(" ");
            return (
              <button
                key={opt.key}
                onClick={() => setSelected(opt.key)}
                data-testid={`onboarding-option-${opt.key}`}
                className={cn(
                  "text-left p-8 rounded-lg border border-border bg-card transition-all",
                  "hover:-translate-y-[2px] hover:shadow-sm",
                  `stagger-in stagger-in-${4 + i}`,
                  isSel && `ring-2 ${ring} ring-offset-2 ring-offset-background`
                )}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={cn("size-10 rounded-md flex items-center justify-center text-white", bg)}>
                    <Icon className="size-5" strokeWidth={1.5} />
                  </div>
                  {isSel && <Check className={cn("size-5", txt)} strokeWidth={2} />}
                </div>
                <div className="font-display text-xl font-semibold">{opt.title}</div>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{opt.desc}</p>
                <ul className="mt-6 space-y-1.5">
                  {opt.features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className={cn("size-1 rounded-full", bg)} /> {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-12 flex items-center justify-between">
          <div className="text-xs font-mono text-muted-foreground">You can switch profiles anytime from Settings.</div>
          <Button size="lg" disabled={!selected || saving} onClick={submit} data-testid="onboarding-continue" className="gap-2">
            {saving ? "Saving…" : "Continue"} <ArrowRight className="size-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </div>
  );
}
