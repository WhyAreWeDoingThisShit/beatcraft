"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  LayoutGrid,
  BookOpen,
  TrendingUp,
  Settings,
  Settings2,
  Plus,
  Download,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLiveProjects } from "@/lib/use-live";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function NavLink({
  href,
  icon: Icon,
  label,
  shortcut,
  active,
  collapsed,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  active: boolean;
  collapsed: boolean;
}) {
  const cls = cn(
    "flex items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
    collapsed ? "h-8 w-8 mx-auto justify-center" : "h-8 w-full gap-2.5 px-2 text-sm",
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className={cls}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          }
        />
        <TooltipContent side="right">
          {label}
          {shortcut && (
            <kbd className="ml-2 text-[10px] text-muted-foreground">{shortcut}</kbd>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cls}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      {shortcut && (
        <kbd className="rounded bg-muted/50 px-1 font-mono text-[9px] text-muted-foreground/50">
          {shortcut}
        </kbd>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const params = useParams();
  const projects = useLiveProjects();
  const { canInstall, install, dismiss } = useInstallPrompt();

  const projectId = (params as { id?: string })?.id ?? null;

  const projectNavItems = projectId
    ? [
        { href: `/projects/${projectId}`, icon: LayoutGrid, label: "Board", shortcut: "G B" },
        { href: `/projects/${projectId}/wiki`, icon: BookOpen, label: "Wiki", shortcut: "G W" },
        { href: `/projects/${projectId}/progress`, icon: TrendingUp, label: "Progress", shortcut: "G R" },
        { href: `/projects/${projectId}/settings`, icon: Settings, label: "Settings", shortcut: "G S" },
      ]
    : [];

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-14" : "w-56",
      )}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-3">
        {!collapsed ? (
          <>
            <Link
              href="/"
              className="flex items-center gap-2 overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                B
              </div>
              <span className="truncate font-semibold text-sidebar-foreground">Beatcraft</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/"
                  aria-label="Beatcraft — go home"
                  className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  B
                </Link>
              }
            />
            <TooltipContent side="right">Beatcraft</TooltipContent>
          </Tooltip>
        )}
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4" aria-label="Site navigation">

        {/* Project nav */}
        {projectNavItems.length > 0 && (
          <div>
            {!collapsed && (
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                This project
              </p>
            )}
            <ul className="space-y-0.5" role="list">
              {projectNavItems.map(({ href, icon, label, shortcut }) => (
                <li key={href}>
                  <NavLink
                    href={href}
                    icon={icon}
                    label={label}
                    shortcut={shortcut}
                    active={pathname === href}
                    collapsed={collapsed}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Projects list */}
        <div>
          {!collapsed && (
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Projects
              </p>
              <Link
                href="/projects/new"
                className="text-muted-foreground/70 hover:text-sidebar-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="New project"
              >
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {projects !== undefined && projects.length === 0 ? (
            !collapsed && (
              <div className="px-2 py-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">No projects yet.</p>
                <Link
                  href="/projects/new"
                  className="text-xs text-primary hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Start your first
                </Link>
              </div>
            )
          ) : (
            <ul className="space-y-0.5" role="list">
              {(projects ?? []).slice(0, 10).map((p) => {
                const href = `/projects/${p.id}`;
                const active = projectId === p.id;
                const initials = p.title.slice(0, 2).toUpperCase();

                if (collapsed) {
                  return (
                    <li key={p.id}>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Link
                              href={href}
                              aria-label={p.title}
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "flex h-8 w-8 mx-auto items-center justify-center rounded-md text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                active
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              )}
                            >
                              {initials}
                            </Link>
                          }
                        />
                        <TooltipContent side="right">{p.title}</TooltipContent>
                      </Tooltip>
                    </li>
                  );
                }

                return (
                  <li key={p.id}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-sidebar-primary/10 text-sidebar-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white bg-sidebar-primary">
                        {initials}
                      </span>
                      <span className="flex-1 truncate">{p.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>

      <Separator />

      {/* Footer */}
      <div className="flex flex-col gap-1 p-2">
        {/* Install prompt */}
        {canInstall && (
          !collapsed ? (
            <div className="flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-1.5">
              <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1 truncate text-xs text-muted-foreground">Install app</span>
              <Button size="sm" className="h-6 px-2 text-xs" onClick={install}>Install</Button>
              <button
                type="button"
                onClick={dismiss}
                className="text-muted-foreground/50 hover:text-muted-foreground text-xs"
                aria-label="Dismiss install prompt"
              >
                ×
              </button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="flex h-8 w-8 mx-auto items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={install}
                    aria-label="Install app"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                  </button>
                }
              />
              <TooltipContent side="right">Install app</TooltipContent>
            </Tooltip>
          )
        )}

        {/* Global settings */}
        <NavLink
          href="/settings"
          icon={Settings2}
          label="Settings"
          active={pathname === "/settings"}
          collapsed={collapsed}
        />

        {/* Theme toggle */}
        {!collapsed ? (
          <button
            type="button"
            className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <Sun className="h-4 w-4 shrink-0 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden />
            <Moon className="absolute h-4 w-4 shrink-0 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden />
            <span className="pl-6">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="flex h-8 w-8 mx-auto items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden />
                </button>
              }
            />
            <TooltipContent side="right">Toggle theme</TooltipContent>
          </Tooltip>
        )}

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            type="button"
            className="flex h-8 w-8 mx-auto items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
