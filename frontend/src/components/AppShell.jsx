import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, CalendarDays, ListTodo, Settings, LogOut,
  GraduationCap, BookOpen, Timer, Users, Receipt, Sparkles, CalendarRange, Lightbulb,
  Sun, Moon, Monitor, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

const accents = {
  student: "bg-emerald-500",
  freelancer: "bg-blue-500",
  creator: "bg-amber-500",
};
const accentLabels = {
  student: "Student",
  freelancer: "Freelancer",
  creator: "Creator",
};

function NavItem({ to, icon: Icon, label, testid }) {
  return (
    <NavLink
      to={to}
      end
      data-testid={testid}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-accent/60",
          isActive && "bg-accent text-foreground"
        )
      }
    >
      <Icon className="size-4" strokeWidth={1.5} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const pt = user?.profile_type;

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[240px_1fr] bg-background text-foreground">
      <aside className="hidden md:flex md:flex-col border-r border-border bg-background px-4 py-6 sticky top-0 h-screen">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 mb-8" data-testid="app-logo">
          <div className={cn("size-7 rounded-md flex items-center justify-center text-[10px] font-bold tracking-wider text-white", pt ? accents[pt] : "bg-foreground text-background")}>
            PL
          </div>
          <div>
            <div className="font-display font-semibold leading-none">Plannr</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
              {pt ? accentLabels[pt] : "Schedule"}
            </div>
          </div>
        </Link>

        <div className="label-xs px-2 mb-2">General</div>
        <nav className="flex flex-col gap-1 mb-6">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" testid="nav-dashboard" />
          <NavItem to="/tasks" icon={ListTodo} label="Tasks" testid="nav-tasks" />
          <NavItem to="/calendar" icon={CalendarDays} label="Calendar" testid="nav-calendar" />
        </nav>

        {pt === "student" && (
          <>
            <div className="label-xs px-2 mb-2">Study</div>
            <nav className="flex flex-col gap-1 mb-6">
              <NavItem to="/student/subjects" icon={BookOpen} label="Subjects" testid="nav-subjects" />
              <NavItem to="/student/exams" icon={GraduationCap} label="Exams" testid="nav-exams" />
            </nav>
          </>
        )}

        {pt === "freelancer" && (
          <>
            <div className="label-xs px-2 mb-2">Work</div>
            <nav className="flex flex-col gap-1 mb-6">
              <NavItem to="/freelancer/clients" icon={Users} label="Clients" testid="nav-clients" />
              <NavItem to="/freelancer/time" icon={Timer} label="Time tracker" testid="nav-time" />
              <NavItem to="/freelancer/payments" icon={Receipt} label="Payments" testid="nav-payments" />
            </nav>
          </>
        )}

        {pt === "creator" && (
          <>
            <div className="label-xs px-2 mb-2">Create</div>
            <nav className="flex flex-col gap-1 mb-6">
              <NavItem to="/creator/content" icon={CalendarRange} label="Content" testid="nav-content" />
              <NavItem to="/creator/ideas" icon={Lightbulb} label="Idea bank" testid="nav-ideas" />
            </nav>
          </>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-6 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-accent/60 transition-colors w-full" data-testid="user-menu-trigger">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="size-7">
                    <AvatarImage src={user?.picture} alt={user?.name} />
                    <AvatarFallback className="text-[10px]">{user?.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="text-left min-w-0">
                    <div className="text-sm truncate max-w-[130px]">{user?.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[130px]">{user?.email}</div>
                  </div>
                </div>
                <ChevronDown className="size-4 text-muted-foreground" strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="light" data-testid="theme-light"><Sun className="size-4 mr-2" /> Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" data-testid="theme-dark"><Moon className="size-4 mr-2" /> Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system" data-testid="theme-system"><Monitor className="size-4 mr-2" /> System</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
                <Settings className="size-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                <LogOut className="size-4 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="min-w-0">
        <TopBar />
        <div className="px-6 md:px-10 py-8 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

function TopBar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  return (
    <div className="md:hidden flex items-center justify-between border-b border-border px-4 py-3 sticky top-0 bg-background z-30">
      <Link to="/dashboard" className="font-display font-semibold text-sm flex items-center gap-2">
        <Sparkles className="size-4" strokeWidth={1.5} /> Plannr
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2" data-testid="mobile-user-menu">
            <Avatar className="size-7"><AvatarImage src={user?.picture} /><AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback></Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
