
/**
 * 🧭 HOW TO UPLOAD YOUR APP TO GITHUB & DEPLOY ON VERCEL (FOR BEGINNERS)
 * (Kept as a comment so it does NOT render in the app and cannot cause React errors.)
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Plus, Trash2, ChevronLeft, ChevronRight, Flag, BarChart3, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// -----------------------------
// Helper Types
// -----------------------------

type Milestone = {
  id: string;
  title: string;
  date: string; // start ISO yyyy-MM-dd
  endDate?: string | null; // optional end ISO yyyy-MM-dd (inclusive)
  notes?: string;
  projectId: string;
  labels?: string[]; // tags for filtering
};

type Project = {
  id: string;
  name: string;
  color: string; // hex
};

// -----------------------------
// Local Storage helpers
// -----------------------------

const LS_KEY_PROJECTS = "pc_projects_v1";
const LS_KEY_MILESTONES = "pc_milestones_v1";

const saveLS = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));
const readLS = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

// -----------------------------
// Color options
// -----------------------------

const COLOR_OPTIONS = [
  "#0ea5e9", // sky-500
  "#8b5cf6", // violet-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#14b8a6", // teal-500
  "#f43f5e", // rose-500
  "#22c55e", // green-500
];

// -----------------------------
// Modal (simple, headless)
// -----------------------------

function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative z-10 w-[92vw] max-w-md rounded-2xl bg-white p-4 shadow-xl"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button className="rounded-xl p-1 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

// -----------------------------
// Form Label — marks required fields with *
// -----------------------------

function FormLabel({ label, required = false, htmlFor }: { label: string; required?: boolean; htmlFor?: string }) {
  return (
    <label className="text-sm font-medium" htmlFor={htmlFor}>
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

// -----------------------------
// Tag (Label) Input
// -----------------------------

function TagInput({ value, onChange, placeholder = "Add label and press Enter" }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const normalize = (t: string) => t.trim().toLowerCase().replace(/\s+/g, "-");
  const add = (raw: string) => {
    const t = normalize(raw);
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="rounded-md border border-slate-300 bg-white p-2">
      <div className="flex flex-wrap gap-1">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">
            {t}
            <button className="rounded-full px-1 text-slate-500 hover:bg-slate-200" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
              ×
            </button>
          </span>
        ))}
        <input
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
        />
      </div>
    </div>
  );
}

// -----------------------------
// Utils
// -----------------------------

const safeEnd = (startISO: string, endISO?: string | null) => {
  if (!endISO) return startISO;
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  return e < s ? startISO : endISO; // ensure end >= start
};

const durationDays = (startISO: string, endISO?: string | null) =>
  differenceInCalendarDays(parseISO(safeEnd(startISO, endISO)), parseISO(startISO)) + 1; // inclusive

const hasAllLabels = (labels: string[] | undefined, required: string[]) =>
  required.every((r) => (labels || []).includes(r));

// -----------------------------
// DEV TESTS — simple runtime checks (console)
// -----------------------------

function runSelfTests() {
  const assert = (name: string, cond: boolean) => {
    if (!cond) throw new Error(`Test failed: ${name}`);
    console.debug(`✓ ${name}`);
  };

  // safeEnd & durationDays
  const s = "2025-01-10";
  assert("safeEnd with no end returns start", safeEnd(s, undefined) === s);
  assert("duration 1 day when no end", durationDays(s, undefined) === 1);
  assert("safeEnd clamps earlier end to start", safeEnd(s, "2025-01-05") === s);
  assert("safeEnd equal start stays same", safeEnd("2025-01-10", "2025-01-10") === "2025-01-10");
  assert("duration 3 days with end 3 days later", durationDays("2025-01-01", "2025-01-03") === 3);

  // labels filter
  assert("hasAllLabels true when all present", hasAllLabels(["risk", "external"], ["risk"]));
  assert("hasAllLabels false when missing", !hasAllLabels(["risk"], ["external"]));
}

// -----------------------------
// Main Component
// -----------------------------

export default function ProjectCalendarApp() {
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [projects, setProjects] = useState<Project[]>(() => readLS<Project[]>(LS_KEY_PROJECTS, []));
  const [milestones, setMilestones] = useState<Milestone[]>(() => readLS<Milestone[]>(LS_KEY_MILESTONES, []));
  const [newProject, setNewProject] = useState({ name: "", color: COLOR_OPTIONS[0] });
  const [newMilestone, setNewMilestone] = useState({
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    projectId: "",
    notes: "",
    labels: [] as string[],
  });
  const [mode, setMode] = useState<"calendar" | "timeline">("calendar");

  // Filters
  const [filterProjectId, setFilterProjectId] = useState<string>("all");
  const [filterLabels, setFilterLabels] = useState<string[]>([]);

  // Modal state for create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null => creating
  const [draft, setDraft] = useState<{
    title: string;
    date: string;
    endDate: string;
    projectId: string;
    notes: string;
    labels: string[];
  }>({
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    projectId: "",
    notes: "",
    labels: [],
  });

  useEffect(() => saveLS(LS_KEY_PROJECTS, projects), [projects]);
  useEffect(() => saveLS(LS_KEY_MILESTONES, milestones), [milestones]);

  useEffect(() => {
    // If there are projects but no project selected for forms, pick the first
    if (!newMilestone.projectId && projects.length) {
      setNewMilestone((m) => ({ ...m, projectId: projects[0].id }));
    }
    if (!draft.projectId && projects.length) {
      setDraft((d) => ({ ...d, projectId: projects[0].id }));
    }
  }, [projects]);

  useEffect(() => {
    try {
      runSelfTests();
      console.debug("All self-tests passed");
    } catch (e) {
      console.error(e);
    }
  }, []);

  const monthLabel = format(viewDate, "MMMM yyyy");

  // Helpers: derived sets
  const allLabels = useMemo(() => {
    const set = new Set<string>();
    milestones.forEach((m) => (m.labels || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [milestones]);

  const applyFilters = (ms: Milestone[]) =>
    ms
      .filter((m) => (filterProjectId === "all" ? true : m.projectId === filterProjectId))
      .filter((m) => (filterLabels.length ? hasAllLabels(m.labels, filterLabels) : true));

  // Calendar grid days (6 weeks to cover all cases)
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [viewDate]);

  const milestonesByDay = useMemo(() => {
    const map = new Map<string, Milestone[]>();
    const src = applyFilters(milestones);
    for (const m of src) {
      const s = parseISO(m.date);
      const e = parseISO(safeEnd(m.date, m.endDate));
      for (let d = s; d <= e; d = addDays(d, 1)) {
        const key = format(d, "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(m);
      }
    }
    return map;
  }, [milestones, filterProjectId, filterLabels]);

  const projectsMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);

  const addProject = () => {
    if (!newProject.name.trim()) return;
    const proj: Project = { id: uuidv4(), name: newProject.name.trim(), color: newProject.color };
    setProjects((p) => [...p, proj]);
    setNewProject({ name: "", color: COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)] });
  };

  const deleteProject = (id: string) => {
    setProjects((p) => p.filter((x) => x.id !== id));
    setMilestones((ms) => ms.filter((m) => m.projectId !== id));
  };

  const addMilestone = () => {
    if (!newMilestone.title.trim() || !newMilestone.projectId) return;
    const end = safeEnd(newMilestone.date, newMilestone.endDate);
    const ms: Milestone = {
      id: uuidv4(),
      title: newMilestone.title.trim(),
      date: newMilestone.date,
      endDate: end,
      projectId: newMilestone.projectId,
      notes: newMilestone.notes,
      labels: (newMilestone.labels || []).map((t) => t.trim().toLowerCase().replace(/\s+/g, "-")),
    };
    setMilestones((m) => [...m, ms]);
    setNewMilestone((m) => ({ ...m, title: "" }));
  };

  const deleteMilestone = (id: string) => setMilestones((m) => m.filter((x) => x.id !== id));

  // Create via day click
  const openCreateForDay = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    setEditingId(null);
    setDraft({ title: "", date: iso, endDate: iso, projectId: projects[0]?.id || "", notes: "", labels: [] });
    setModalOpen(true);
  };

  // Edit via milestone click
  const openEditMilestone = (m: Milestone) => {
    const end = safeEnd(m.date, m.endDate);
    setEditingId(m.id);
    setDraft({ title: m.title, date: m.date, endDate: end || m.date, projectId: m.projectId, notes: m.notes || "", labels: m.labels || [] });
    setModalOpen(true);
  };

  const saveDraft = () => {
    if (!draft.title.trim() || !draft.projectId) return;
    const end = safeEnd(draft.date, draft.endDate);
    const normLabels = (draft.labels || []).map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"));
    if (editingId) {
      setMilestones((ms) =>
        ms.map((m) =>
          m.id === editingId
            ? { ...m, title: draft.title.trim(), date: draft.date, endDate: end, projectId: draft.projectId, notes: draft.notes, labels: normLabels }
            : m
        )
      );
    } else {
      const ms: Milestone = { id: uuidv4(), title: draft.title.trim(), date: draft.date, endDate: end, projectId: draft.projectId, notes: draft.notes, labels: normLabels };
      setMilestones((m) => [...m, ms]);
    }
    setModalOpen(false);
  };

  const deleteFromModal = () => {
    if (editingId) setMilestones((ms) => ms.filter((m) => m.id !== editingId));
    setModalOpen(false);
  };

  // Drag & Drop support on calendar cells
  const onDragStartMilestone = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/milestone-id", id);
  };

  const onDropOnDay = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/milestone-id");
    if (!id) return;
    const newStart = format(day, "yyyy-MM-dd");
    setMilestones((ms) =>
      ms.map((m) => {
        if (m.id !== id) return m;
        const dur = durationDays(m.date, m.endDate);
        const newEnd = format(addDays(parseISO(newStart), Math.max(0, dur - 1)), "yyyy-MM-dd");
        return { ...m, date: newStart, endDate: newEnd };
      })
    );
  };

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return Math.round((+end - +start) / (1000 * 60 * 60 * 24)) + 1;
  }, [viewDate]);

  const timelineRows = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return projects.map((p) => {
      const items = applyFilters(milestones)
        .filter((m) => m.projectId === p.id)
        .filter((m) => {
          // Show if range intersects with month
          const s = parseISO(m.date);
          const e = parseISO(safeEnd(m.date, m.endDate));
          return e >= start && s <= end;
        })
        .map((m) => {
          const s = parseISO(m.date);
          const e = parseISO(safeEnd(m.date, m.endDate));
          const monthStart = startOfMonth(viewDate);
          const startIndex = Math.max(0, Math.floor((+s - +monthStart) / (1000 * 60 * 60 * 24)));
          const endIndex = Math.min(daysInMonth - 1, Math.floor((+e - +monthStart) / (1000 * 60 * 60 * 24)));
          return { id: m.id, title: m.title, notes: m.notes || "", startIndex, endIndex };
        });
      return { project: p, items };
    });
  }, [projects, milestones, viewDate, daysInMonth, filterProjectId, filterLabels]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Project Calendar & Milestones</h1>
            <p className="text-sm text-slate-600">Plan projects, add milestones (with end dates, notes, and labels), and visualize everything on a calendar or timeline. Data is saved locally in your browser.</p>
          </div>
          <div className="flex flex-col gap-2 md:w-[520px]">
            <div className="flex items-center gap-2">
              <Select value={filterProjectId} onValueChange={setFilterProjectId}>
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-slate-500">Filter by labels</div>
            </div>
            <div className="flex flex-wrap gap-1">
              {allLabels.length === 0 && <span className="text-xs text-slate-400">No labels yet — add some to milestones.</span>}
              {allLabels.map((t) => {
                const active = filterLabels.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => setFilterLabels((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
                    className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    title="Toggle label filter"
                  >
                    {t}
                  </button>
                );
              })}
              {filterLabels.length > 0 && (
                <button className="text-[11px] underline text-slate-600" onClick={() => setFilterLabels([])}>Clear</button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: Forms */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Add Project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <FormLabel label="Project name" required />
                  <Input placeholder="e.g., Website Revamp" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} />
                </div>
                <div>
                  <FormLabel label="Color" />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button key={c} onClick={() => setNewProject({ ...newProject, color: c })} className={`h-7 w-7 rounded-full ring-2 transition ${newProject.color === c ? "ring-slate-900" : "ring-transparent"}`} style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                </div>
                <Button className="w-full rounded-2xl" onClick={addProject}>
                  <Plus className="mr-2 h-4 w-4" /> Add project
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Quick Add Milestone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <FormLabel label="Title" required />
                  <Input placeholder="e.g., Kickoff, Beta Launch" value={newMilestone.title} onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <FormLabel label="Start date" required htmlFor="qa-start" />
                    <input
                      id="qa-start"
                      type="date"
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                      value={newMilestone.date}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDownCapture={(e) => e.stopPropagation()}
                      onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value, endDate: safeEnd(e.target.value, newMilestone.endDate) })}
                    />
                  </div>
                  <div>
                    <FormLabel label="End date" htmlFor="qa-end" />
                    <input
                      id="qa-end"
                      type="date"
                      min={newMilestone.date}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                      value={newMilestone.endDate}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDownCapture={(e) => e.stopPropagation()}
                      onChange={(e) => setNewMilestone({ ...newMilestone, endDate: safeEnd(newMilestone.date, e.target.value) })}
                    />
                  </div>
                  <div>
                    <FormLabel label="Project" required />
                    <Select value={newMilestone.projectId} onValueChange={(v) => setNewMilestone({ ...newMilestone, projectId: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem value={p.id} key={p.id} label={p.name}>
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                              {p.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <FormLabel label="Labels" />
                  <TagInput value={newMilestone.labels || []} onChange={(labels) => setNewMilestone({ ...newMilestone, labels })} />
                </div>
                <div>
                  <FormLabel label="Notes" />
                  <textarea value={newMilestone.notes} onChange={(e) => setNewMilestone({ ...newMilestone, notes: e.target.value })} rows={3} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400" placeholder="Any context or checklist details…" />
                </div>
                <Button className="w-full rounded-2xl" onClick={addMilestone} disabled={!projects.length}>
                  <Flag className="mr-2 h-4 w-4" /> Add milestone
                </Button>
                {!projects.length && <p className="text-xs text-slate-500">Add a project first.</p>}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Projects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <AnimatePresence>
                  {projects.length === 0 && <p className="text-sm text-slate-500">No projects yet.</p>}
                  {projects.map((p) => (
                    <motion.div key={p.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center justify-between rounded-xl border bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-sm font-medium">{p.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteProject(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Calendar or Timeline */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <button className="rounded-xl p-1 hover:bg-slate-100" onClick={() => setViewDate((d) => subMonths(d, 1))} aria-label="Prev month">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span>{monthLabel}</span>
                  <button className="rounded-xl p-1 hover:bg-slate-100" onClick={() => setViewDate((d) => addMonths(d, 1))} aria-label="Next month">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant={mode === "calendar" ? "default" : "secondary"} onClick={() => setMode("calendar")} className="rounded-2xl">
                    <CalendarIcon className="mr-2 h-4 w-4" /> Calendar
                  </Button>
                  <Button variant={mode === "timeline" ? "default" : "secondary"} onClick={() => setMode("timeline")} className="rounded-2xl">
                    <BarChart3 className="mr-2 h-4 w-4" /> Timeline
                  </Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => setViewDate(new Date())}>Today</Button>
                </div>
              </CardHeader>

              <CardContent>
                {mode === "calendar" ? (
                  <div>
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 rounded-2xl bg-slate-50 p-2 text-xs font-medium text-slate-600">
                      {"Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(",").map((d) => (
                        <div className="px-2 py-1 text-center" key={d}>
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="mt-2 grid grid-cols-7 gap-1">
                      {calendarDays.map((day) => {
                        const key = format(day, "yyyy-MM-dd");
                        const ms = milestonesByDay.get(key) || [];
                        const muted = !isSameMonth(day, viewDate);
                        return (
                          <div key={key} className={`min-h-[110px] rounded-2xl border bg-white p-2 ${muted ? "opacity-60" : ""} relative cursor-pointer`} onClick={() => openCreateForDay(day)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDropOnDay(e, day)} title={`Click to add milestone on ${format(day, "PPP")}`}>
                            <div className="flex items-center justify-between">
                              <div className={`text-xs ${isToday(day) ? "font-semibold" : ""}`}>{format(day, "d")}</div>
                              {isToday(day) && <span className="text-[10px] rounded-full bg-slate-900 px-2 py-0.5 font-medium text-white">Today</span>}
                            </div>
                            <div className="mt-1 space-y-1">
                              {ms.slice(0, 3).map((m) => {
                                const dur = durationDays(m.date, m.endDate);
                                return (
                                  <div key={m.id} className="flex items-center gap-1 truncate rounded-lg px-1 py-0.5 text-[11px]" style={{ backgroundColor: `${projectsMap[m.projectId]?.color}22`, borderLeft: `3px solid ${projectsMap[m.projectId]?.color}` }} title={`${projectsMap[m.projectId]?.name} · ${m.title}${dur > 1 ? ` (${dur}d)` : ""}`} draggable onDragStart={(e) => onDragStartMilestone(e, m.id)} onClick={(e) => { e.stopPropagation(); openEditMilestone(m); }}>
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: projectsMap[m.projectId]?.color }} />
                                    <span className="truncate">{m.title}{dur > 1 ? ` (${dur}d)` : ""}</span>
                                  </div>
                                );
                              })}
                              {ms.length > 3 && <div className="text-[10px] text-slate-500">+{ms.length - 3} more</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Timeline View
                  <div className="space-y-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                      <span>Days in {monthLabel}</span>
                      <span>{daysInMonth}</span>
                    </div>
                    <div className="space-y-3">
                      {timelineRows.map(({ project, items }) => (
                        <div key={project.id} className="rounded-2xl border bg-white p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                            <span className="text-sm font-semibold">{project.name}</span>
                          </div>
                          <div className="relative h-12 w-full overflow-visible rounded-xl bg-slate-50">
                            {/* base line */}
                            <div className="absolute left-3 right-3 top-1/2 h-0.5 -translate-y-1/2 bg-slate-300" />
                            {/* day tick marks */}
                            <div className="absolute inset-x-3 top-1/2 -translate-y-1/2">
                              <div className="flex h-6 items-center justify-between">
                                {Array.from({ length: daysInMonth }).map((_, i) => (
                                  <div key={i} className="h-2 w-px bg-slate-200" />
                                ))}
                              </div>
                            </div>
                            {/* milestone bars */}
                            {items.map((it) => {
                              const leftPct = (it.startIndex / (daysInMonth - 1 || 1)) * 100;
                              const rightPct = (it.endIndex / (daysInMonth - 1 || 1)) * 100;
                              const widthPct = Math.max(2, rightPct - leftPct + (100 / (daysInMonth - 1 || 1)) * 0.2); // ensure visible
                              return (
                                <div key={it.id} className="absolute top-1/2 -translate-y-1/2 left-3 right-3">
                                  <div className="group relative" style={{ left: `calc(${leftPct}% )`, width: `calc(${widthPct}% )` }}>
                                    <div className="h-3 rounded-full" style={{ backgroundColor: `${project.color}` }} />
                                    <div className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block z-20">
                                      {it.title}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Milestones list */}
            <Card className="mt-6 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">All Milestones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {applyFilters(milestones)
                    .slice()
                    .sort((a, b) => +parseISO(a.date) - +parseISO(b.date))
                    .map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-xl border bg-white p-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: projectsMap[m.projectId]?.color }} />
                            <span className="truncate text-sm font-medium">{m.title}</span>
                          </div>
                          <div className="pl-5 text-xs text-slate-600">
                            {format(parseISO(m.date), "PPP")} {m.endDate && safeEnd(m.date, m.endDate) !== m.date ? `– ${format(parseISO(safeEnd(m.date, m.endDate)!), "PPP")}` : ""} · {projectsMap[m.projectId]?.name || "Unknown project"}
                            {m.labels && m.labels.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {m.labels.map((t) => (
                                  <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{t}</span>
                                ))}
                              </div>
                            )}
                            {m.notes ? <div className="mt-1 line-clamp-2 max-w-md pr-4 text-slate-500">{m.notes}</div> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditMilestone(m)} title="Edit">
                            <Flag className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMilestone(m.id)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-500">Made with ❤️ — data stays in your browser (localStorage).</footer>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit milestone" : "New milestone"}>
          <div className="space-y-3">
            <div>
              <FormLabel label="Title" required />
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g., Kickoff, Beta Launch" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel label="Start date" required />
                <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value, endDate: safeEnd(e.target.value, draft.endDate) || e.target.value })} />
              </div>
              <div>
                <FormLabel label="End date" />
                <Input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: safeEnd(draft.date, e.target.value) || draft.date })} />
              </div>
            </div>
            <div>
              <FormLabel label="Project" required />
              <Select value={draft.projectId} onValueChange={(v) => setDraft({ ...draft, projectId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem value={p.id} key={p.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel label="Labels" />
              <TagInput value={draft.labels} onChange={(labels) => setDraft({ ...draft, labels })} />
            </div>
            <div>
              <FormLabel label="Notes" />
              <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={3} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400" placeholder="Any context or checklist details…" />
            </div>
            <div className="flex items-center justify-between pt-1">
              {editingId ? (
                <Button variant="destructive" onClick={deleteFromModal}>Delete</Button>
              ) : (
                <span className="text-xs text-slate-500">Press Enter to save</span>
              )}
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={saveDraft}>{editingId ? "Save changes" : "Create"}</Button>
              </div>
            </div>
          </div>
        </Modal>
      </AnimatePresence>
    </div>
  );
}
