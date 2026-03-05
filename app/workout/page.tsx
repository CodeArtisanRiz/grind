"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

const T = {
    bg: "#0C0C0D", card: "#131315", border: "#1C1C20", borderHi: "#2A2A30",
    accent: "#D4FF00", accentDim: "#D4FF0015", accentGlow: "#D4FF0055",
    text: "#EFEFEF", sub: "#666672", faint: "#1A1A1E", drop: "#FF9500",
};

const css = `
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  ::-webkit-scrollbar{display:none;}
  body{background:#0C0C0D;overscroll-behavior:none;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes expand{from{opacity:0;max-height:0}to{opacity:1;max-height:600px}}
  @keyframes checkPop{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}
  .fade{animation:fadeUp .2s ease both;}
  .exp{animation:expand .2s ease both;overflow:hidden;}
  .check{animation:checkPop .2s ease both;}
`;

// ─── TYPES ────────────────────────────────────────────────────
interface SetConfig { weight: number; reps: number; }
interface SetLog extends SetConfig { done: boolean; isDropset: boolean; }
interface Exercise { name: string; sets: SetConfig[]; }
interface ExerciseLog { sets: SetLog[]; }
interface Group { name: string; exercises: string[]; }
interface Config {
    weekPlan: Record<number, string[]>;
    groups: Record<string, Group>;
    exercises: Record<string, Exercise>;
}
interface SessionData {
    date: string;
    groupName: string;
    exercises: { name: string; sets: SetLog[] }[];
    totalVol: number;
    created_at?: string;
}

// ─── HELPERS ──────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8);
const todayDow = () => new Date().getDay();
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const api = {
    getConfig: (): Promise<{ config: Config }> => fetch("/api/config").then(r => r.json()),
    saveConfig: (config: Config) => fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config }) }),
    getSessions: (): Promise<{ sessions: SessionData[] }> => fetch("/api/sessions").then(r => r.json()),
    saveSession: (sessionData: SessionData) => fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionData }) }),
};

// ─── ICONS ────────────────────────────────────────────────────
const Ico = {
    back: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M14 5l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    check: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="#0C0C0D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    trash: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 4h10M5.5 4V3h4v1M4 4v8h7V4H4z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    dropArrow: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2v9M3 8l3.5 3L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    logout: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 3H3v12h4M12 6l3 3-3 3M15 9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

// ─── STEPPER ──────────────────────────────────────────────────
function Stepper({ value, unit, step = 1, onChange, big = false }: { value: number; unit: string; step?: number; onChange: (v: number) => void; big?: boolean }) {
    const btnW = big ? 44 : 36;
    const numSize = big ? 22 : 17;
    const numW = big ? 72 : 56;
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", background: T.faint, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                <button onClick={() => onChange(Math.max(0, parseFloat((Number(value) - step).toFixed(2))))}
                    style={{ width: btnW, height: btnW, background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>−</button>
                <div style={{ width: numW, textAlign: "center", fontFamily: "'JetBrains Mono'", fontSize: numSize, fontWeight: 600, color: T.text }}>{value}</div>
                <button onClick={() => onChange(parseFloat((Number(value) + step).toFixed(2)))}
                    style={{ width: btnW, height: btnW, background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>+</button>
            </div>
            <span style={{ fontSize: 10, color: T.sub, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5 }}>{unit}</span>
        </div>
    );
}

// ─── SET ROW ──────────────────────────────────────────────────
function SetRow({ set, idx, onUpdate, onDelete, canDelete, onAddDrop }: {
    set: SetLog; idx: number;
    onUpdate: (idx: number, s: SetLog) => void;
    onDelete: (idx: number) => void;
    canDelete: boolean;
    onAddDrop: (() => void) | null;
}) {
    const [open, setOpen] = useState(false);
    const upd = (field: keyof SetLog, val: unknown) => onUpdate(idx, { ...set, [field]: val });

    return (
        <div style={{ marginBottom: 6 }}>
            <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: open ? "12px 12px 0 0" : 12, background: set.done ? T.accentDim : open ? "#1E1E22" : T.card, border: `1px solid ${set.done ? T.accentGlow : open ? T.borderHi : T.border}`, cursor: "pointer", transition: "all 0.15s", opacity: set.done ? 0.65 : 1 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: set.isDropset ? T.drop + "22" : set.done ? T.accent : T.faint, border: `1px solid ${set.isDropset ? T.drop + "55" : set.done ? T.accentGlow : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 600, color: set.isDropset ? T.drop : set.done ? T.accent : T.sub }}>
                    {set.isDropset ? "D" : idx + 1}
                </div>
                <div style={{ flex: 1, display: "flex", gap: 5, alignItems: "baseline" }}>
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, fontWeight: 600, color: T.text }}>{set.weight}</span>
                    <span style={{ fontSize: 11, color: T.sub }}>kg</span>
                    <span style={{ fontSize: 13, color: T.sub, margin: "0 3px" }}>×</span>
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, fontWeight: 600, color: T.text }}>{set.reps}</span>
                    <span style={{ fontSize: 11, color: T.sub }}>reps</span>
                </div>
                {set.done
                    ? <div className="check" style={{ width: 26, height: 26, borderRadius: "50%", background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Ico.check}</div>
                    : <span style={{ color: T.sub, fontSize: 11, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "block" }}>▾</span>}
            </div>

            {open && (
                <div className="exp" style={{ background: "#1A1A1E", borderRadius: "0 0 12px 12px", padding: "14px 14px 12px", border: `1px solid ${T.borderHi}`, borderTop: "none" }}>
                    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        <Stepper value={set.weight} unit="KG" step={0.5} onChange={v => upd("weight", v)} big />
                        <div style={{ width: 1, background: T.border, flexShrink: 0 }} />
                        <Stepper value={set.reps} unit="REPS" step={1} onChange={v => upd("reps", v)} big />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {set.done
                            ? <button onClick={() => upd("done", false)} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: `1px solid ${T.borderHi}`, cursor: "pointer", background: T.faint, color: T.sub, fontFamily: "'Syne'", fontWeight: 800, fontSize: 13, letterSpacing: 2 }}>↩ UNDO</button>
                            : <button onClick={() => { upd("done", true); setOpen(false); }} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "none", cursor: "pointer", background: T.accent, color: "#0C0C0D", fontFamily: "'Syne'", fontWeight: 800, fontSize: 13, letterSpacing: 2 }}>✓  DONE</button>}
                        {canDelete && <button onClick={() => onDelete(idx)} style={{ width: 44, borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ico.trash}</button>}
                    </div>
                </div>
            )}

            {set.done && !set.isDropset && onAddDrop && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
                    <button onClick={onAddDrop} style={{ padding: "5px 14px", borderRadius: 20, background: "none", border: `1px dashed ${T.drop}55`, color: T.drop, cursor: "pointer", fontSize: 11, fontFamily: "'JetBrains Mono'", letterSpacing: 1, display: "flex", alignItems: "center", gap: 5 }}>
                        {Ico.dropArrow} DROP SET
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── EXERCISE PANEL ───────────────────────────────────────────
function ExercisePanel({ exercise, log, onLogUpdate }: { exercise: Exercise; log?: ExerciseLog; onLogUpdate: (d: ExerciseLog) => void }) {
    const sets: SetLog[] = log?.sets || exercise.sets.map(s => ({ ...s, done: false, isDropset: false }));
    const done = sets.filter(s => s.done).length;
    const vol = sets.reduce((a, s) => a + (s.done ? s.weight * s.reps : 0), 0);

    const updateSet = (idx: number, updated: SetLog) => onLogUpdate({ sets: sets.map((s, i) => i === idx ? updated : s) });
    const deleteSet = (idx: number) => onLogUpdate({ sets: sets.filter((_, i) => i !== idx) });
    const addDropAfter = (idx: number) => {
        const ref = sets[idx];
        const drop: SetLog = { weight: Math.max(0, parseFloat((ref.weight - 5).toFixed(2))), reps: ref.reps + 2, done: false, isDropset: true };
        onLogUpdate({ sets: [...sets.slice(0, idx + 1), drop, ...sets.slice(idx + 1)] });
    };

    return (
        <div>
            <div style={{ display: "flex", gap: 20, marginBottom: 14, padding: "10px 14px", background: T.card, borderRadius: 10, border: `1px solid ${T.border}` }}>
                <div>
                    <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 17, fontWeight: 600, color: done === sets.length && sets.length > 0 ? T.accent : T.text }}>{done}<span style={{ fontSize: 12, color: T.sub }}>/{sets.length}</span></div>
                    <div style={{ fontSize: 9, color: T.sub, letterSpacing: 2, marginTop: 1 }}>SETS</div>
                </div>
                {vol > 0 && <div><div style={{ fontFamily: "'JetBrains Mono'", fontSize: 17, fontWeight: 600, color: T.accent }}>{vol}</div><div style={{ fontSize: 9, color: T.sub, letterSpacing: 2, marginTop: 1 }}>KG VOL</div></div>}
                <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
                    {sets.map((s, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: s.done ? T.accent : s.isDropset ? T.drop : T.border, boxShadow: s.done ? `0 0 5px ${T.accent}` : "none", transition: "all 0.2s" }} />)}
                </div>
            </div>
            {sets.map((set, i) => {
                const showDrop = set.done && !set.isDropset && sets[i + 1]?.isDropset !== true;
                return <SetRow key={i} set={set} idx={i} onUpdate={updateSet} onDelete={deleteSet} canDelete={sets.length > 1} onAddDrop={showDrop ? () => addDropAfter(i) : null} />;
            })}
        </div>
    );
}

// ─── WORKOUT TAB ──────────────────────────────────────────────
function WorkoutTab({ weekPlan, groups, exercises, onSessionSave }: { weekPlan: Config["weekPlan"]; groups: Config["groups"]; exercises: Config["exercises"]; onSessionSave: (s: SessionData) => Promise<void> }) {
    const [screen, setScreen] = useState<"home" | "group">("home");
    const [activeGroup, setActiveGroup] = useState<string | null>(null);
    const [activeEx, setActiveEx] = useState<string | null>(null);
    const [log, setLog] = useState<Record<string, ExerciseLog>>({});

    const dow = todayDow();
    const todayGroupIds = weekPlan[dow] || [];
    const todayGroups = todayGroupIds.map(gid => ({ gid, g: groups[gid] })).filter(x => x.g);
    const updateLog = (exId: string, data: ExerciseLog) => setLog(prev => ({ ...prev, [exId]: { ...(prev[exId] || {}), ...data } }));

    const groupProgress = (gid: string) => {
        const g = groups[gid]; if (!g) return { done: 0, total: 0 };
        let done = 0, total = 0;
        (g.exercises || []).forEach(exId => {
            const ex = exercises[exId]; if (!ex) return;
            const sets = log[exId]?.sets || ex.sets;
            total += sets.length; done += sets.filter((s: SetLog | SetConfig) => (s as SetLog).done).length;
        });
        return { done, total };
    };

    const handleFinishGroup = async () => {
        if (!activeGroup) return;
        const g = groups[activeGroup];
        const sessionData: SessionData = {
            date: new Date().toISOString().split("T")[0],
            groupName: g.name,
            exercises: (g.exercises || []).map(exId => {
                const ex = exercises[exId]; if (!ex) return null;
                return { name: ex.name, sets: log[exId]?.sets || ex.sets.map(s => ({ ...s, done: false, isDropset: false })) };
            }).filter(Boolean) as SessionData["exercises"],
            totalVol: (g.exercises || []).reduce((a, exId) => {
                const sets = log[exId]?.sets || exercises[exId]?.sets || [];
                return a + sets.reduce((b: (number), s: SetLog | SetConfig) => b + ((s as SetLog).done ? (s.weight * s.reps) : 0), 0);
            }, 0),
        };
        await onSessionSave(sessionData);
    };

    if (screen === "home") {
        if (todayGroups.length === 0) return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "75vh", gap: 16, textAlign: "center", padding: 32 }}>
                <div style={{ fontSize: 54 }}>🛌</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2, fontFamily: "'Syne'" }}>REST DAY</div>
                <div style={{ color: T.sub, fontSize: 14 }}>Recovery is training.</div>
            </div>
        );
        return (
            <div style={{ padding: "22px 16px 100px" }}>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: T.sub, letterSpacing: 2, marginBottom: 4 }}>
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase()}
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 0.3, marginBottom: 22, fontFamily: "'Syne'" }}>Today</div>
                {todayGroups.map(({ gid, g }) => {
                    const { done, total } = groupProgress(gid);
                    const pct = total > 0 ? done / total : 0;
                    const allDone = pct === 1 && total > 0;
                    return (
                        <div key={gid} className="fade" onClick={() => { setActiveGroup(gid); setScreen("group"); }}
                            style={{ marginBottom: 12, padding: "20px 18px", borderRadius: 16, cursor: "pointer", background: T.card, border: `1px solid ${allDone ? T.accentGlow : T.border}`, position: "relative", overflow: "hidden", transition: "border-color 0.3s" }}>
                            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, background: T.accentDim, transition: "width 0.5s ease" }} />
                            <div style={{ position: "relative" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: allDone ? T.accent : T.text, fontFamily: "'Syne'" }}>{g.name}</div>
                                    <span style={{ color: T.sub, fontSize: 18 }}>›</span>
                                </div>
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                    <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: allDone ? T.accent : T.sub }}>{done}/{total} sets</div>
                                    <div style={{ flex: 1, height: 2, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${pct * 100}%`, background: T.accent, transition: "width 0.4s", boxShadow: pct > 0 ? `0 0 8px ${T.accent}` : "none" }} />
                                    </div>
                                    <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: T.sub }}>{(g.exercises || []).length} ex</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    const curGroup = activeGroup ? groups[activeGroup] : null;
    if (screen === "group" && curGroup && activeGroup) {
        const exIds = curGroup.exercises || [];
        const { done, total } = groupProgress(activeGroup);
        const allGroupDone = done === total && total > 0;
        return (
            <div style={{ paddingBottom: 100 }}>
                <div style={{ padding: "16px 16px 14px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, background: T.bg, zIndex: 10, borderBottom: `1px solid ${T.border}` }}>
                    <button onClick={() => { setScreen("home"); setActiveEx(null); }} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", padding: 4, display: "flex" }}>{Ico.back}</button>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne'", flex: 1 }}>{curGroup.name}</div>
                    {allGroupDone && <button onClick={handleFinishGroup} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: T.accent, color: "#0C0C0D", fontFamily: "'Syne'", fontWeight: 800, fontSize: 12, letterSpacing: 1.5, cursor: "pointer" }}>SAVE</button>}
                </div>
                <div style={{ padding: "14px 16px" }}>
                    {exIds.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: T.sub, fontSize: 14 }}>No exercises. Add in Config.</div>}
                    {exIds.map(exId => {
                        const ex = exercises[exId]; if (!ex) return null;
                        const sets = log[exId]?.sets || ex.sets;
                        const done = sets.filter((s: SetLog | SetConfig) => (s as SetLog).done).length;
                        const total = sets.length;
                        const isOpen = activeEx === exId;
                        const allDone = done === total && total > 0;
                        return (
                            <div key={exId} style={{ marginBottom: 10 }}>
                                <div onClick={() => setActiveEx(isOpen ? null : exId)}
                                    style={{ padding: "14px 16px", borderRadius: isOpen ? "12px 12px 0 0" : 12, cursor: "pointer", background: T.card, border: `1px solid ${allDone ? T.accentGlow : isOpen ? T.borderHi : T.border}`, display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: allDone ? T.accent : T.text }}>{ex.name}</div>
                                        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: T.sub, marginTop: 3 }}>{done}/{total} sets</div>
                                    </div>
                                    <div style={{ display: "flex", gap: 4 }}>
                                        {sets.map((s: SetLog | SetConfig, i: number) => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: (s as SetLog).done ? T.accent : (s as SetLog).isDropset ? T.drop : T.border, boxShadow: (s as SetLog).done ? `0 0 5px ${T.accent}` : "none", transition: "all 0.2s" }} />)}
                                    </div>
                                    <span style={{ color: T.sub, fontSize: 11, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                                </div>
                                {isOpen && (
                                    <div className="exp" style={{ background: T.faint, borderRadius: "0 0 12px 12px", padding: "14px 14px 10px", border: `1px solid ${T.borderHi}`, borderTop: "none" }}>
                                        <ExercisePanel exercise={ex} log={log[exId]} onLogUpdate={d => updateLog(exId, d)} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
}

// ─── NEW GROUP SCREEN ─────────────────────────────────────────
function NewGroupScreen({ onBack, onSave }: { onBack: () => void; onSave: (name: string) => void }) {
    const [name, setName] = useState("");
    return (
        <div style={{ padding: "22px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex" }}>{Ico.back}</button>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne'" }}>New Group</div>
            </div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Back, Chest, Legs…" autoFocus
                style={{ width: "100%", padding: "14px 16px", borderRadius: 12, background: T.card, border: `1px solid ${T.borderHi}`, color: T.text, fontSize: 16, fontFamily: "'Syne'", fontWeight: 700, outline: "none", marginBottom: 12 }} />
            <button disabled={!name.trim()} onClick={() => onSave(name.trim())}
                style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: T.accent, color: "#0C0C0D", fontFamily: "'Syne'", fontWeight: 800, fontSize: 15, letterSpacing: 2, cursor: "pointer", opacity: name.trim() ? 1 : 0.4 }}>
                CREATE
            </button>
        </div>
    );
}

// ─── EXERCISE CONFIG SCREEN ───────────────────────────────────
function ExerciseConfigScreen({ isNew, existing, onBack, onSave, onDelete }: { isNew: boolean; existing?: Exercise; onBack: () => void; onSave: (name: string, sets: SetConfig[]) => void; onDelete: () => void }) {
    const [exName, setExName] = useState(existing?.name || "");
    const [sets, setSets] = useState<SetConfig[]>(existing?.sets || [{ weight: 20, reps: 12 }]);
    const addSet = () => setSets(s => [...s, { weight: s[s.length - 1]?.weight || 20, reps: s[s.length - 1]?.reps || 12 }]);
    const removeSet = (i: number) => sets.length > 1 && setSets(s => s.filter((_, si) => si !== i));
    const upd = (i: number, field: keyof SetConfig, val: number) => setSets(s => s.map((set, si) => si === i ? { ...set, [field]: val } : set));
    return (
        <div style={{ padding: "22px 16px 100px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex" }}>{Ico.back}</button>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne'", flex: 1 }}>{isNew ? "New Exercise" : "Edit Exercise"}</div>
                {!isNew && <button onClick={onDelete} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex" }}>{Ico.trash}</button>}
            </div>
            <input value={exName} onChange={e => setExName(e.target.value)} placeholder="Exercise name…"
                style={{ width: "100%", padding: "14px 16px", borderRadius: 12, background: T.card, border: `1px solid ${T.borderHi}`, color: T.text, fontSize: 16, fontFamily: "'Syne'", fontWeight: 700, outline: "none", marginBottom: 18 }} />
            <div style={{ fontSize: 11, color: T.sub, letterSpacing: 2, marginBottom: 10, fontFamily: "'JetBrains Mono'" }}>TARGET SETS</div>
            {sets.map((set, i) => (
                <div key={i} style={{ marginBottom: 10, padding: 14, borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: T.sub, letterSpacing: 2 }}>SET {i + 1}</span>
                        {sets.length > 1 && <button onClick={() => removeSet(i)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex" }}>{Ico.trash}</button>}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <Stepper value={set.weight} unit="KG" step={0.5} onChange={v => upd(i, "weight", v)} />
                        <div style={{ width: 1, background: T.border }} />
                        <Stepper value={set.reps} unit="REPS" step={1} onChange={v => upd(i, "reps", v)} />
                    </div>
                </div>
            ))}
            <button onClick={addSet} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: `1px dashed ${T.borderHi}`, background: "none", color: T.sub, cursor: "pointer", fontSize: 14, marginBottom: 14, fontFamily: "'Syne'", fontWeight: 700, letterSpacing: 1 }}>
                + SET
            </button>
            <button onClick={() => exName.trim() && onSave(exName.trim(), sets)} disabled={!exName.trim()}
                style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: T.accent, color: "#0C0C0D", fontFamily: "'Syne'", fontWeight: 800, fontSize: 15, letterSpacing: 2, cursor: "pointer", opacity: exName.trim() ? 1 : 0.4 }}>
                SAVE
            </button>
        </div>
    );
}

// ─── CONFIG TAB ───────────────────────────────────────────────
function ConfigTab({ weekPlan, groups, exercises, onSave }: { weekPlan: Config["weekPlan"]; groups: Config["groups"]; exercises: Config["exercises"]; onSave: (c: Config) => void }) {
    const [screen, setScreen] = useState<"week" | "day" | "group" | "newGroup" | "exercise">("week");
    const [selDay, setSelDay] = useState<number | null>(null);
    const [selGroup, setSelGroup] = useState<string | null>(null);
    const [selEx, setSelEx] = useState<string | null>(null);
    const [d, setD] = useState<Config>({ weekPlan: { ...weekPlan }, groups: { ...groups }, exercises: { ...exercises } });

    const save = (next: Config) => { setD(next); onSave(next); };

    if (screen === "week") return (
        <div style={{ padding: "22px 16px 100px" }}>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 22, fontFamily: "'Syne'" }}>Config</div>
            <div style={{ fontSize: 11, color: T.sub, letterSpacing: 2, marginBottom: 10, fontFamily: "'JetBrains Mono'" }}>WEEKLY SCHEDULE</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 26 }}>
                {DAYS.map((day, i) => {
                    const has = (d.weekPlan[i] || []).length > 0;
                    return <div key={i} onClick={() => { setSelDay(i); setScreen("day"); }} style={{ padding: "10px 0", textAlign: "center", borderRadius: 10, cursor: "pointer", background: has ? T.accentDim : T.card, border: `1px solid ${has ? T.accentGlow : T.border}`, color: has ? T.accent : T.sub, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
                        {day.toUpperCase()}
                        {has && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.accent, margin: "3px auto 0" }} />}
                    </div>;
                })}
            </div>
            <div style={{ fontSize: 11, color: T.sub, letterSpacing: 2, marginBottom: 10, fontFamily: "'JetBrains Mono'" }}>MUSCLE GROUPS</div>
            {Object.entries(d.groups).map(([gid, g]) => (
                <div key={gid} onClick={() => { setSelGroup(gid); setScreen("group"); }} style={{ padding: "14px 16px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}`, marginBottom: 8, display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{g.name}</div>
                        <div style={{ fontSize: 11, color: T.sub, fontFamily: "'JetBrains Mono'", marginTop: 2 }}>{(g.exercises || []).length} exercises</div>
                    </div>
                    <span style={{ color: T.sub }}>›</span>
                </div>
            ))}
            <button onClick={() => setScreen("newGroup")} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1px dashed ${T.borderHi}`, background: "none", color: T.sub, cursor: "pointer", fontSize: 14, fontFamily: "'Syne'", fontWeight: 700, letterSpacing: 1, marginTop: 4 }}>
                + NEW GROUP
            </button>
        </div>
    );

    if (screen === "newGroup") return <NewGroupScreen onBack={() => setScreen("week")} onSave={name => { const gid = uid(); save({ ...d, groups: { ...d.groups, [gid]: { name, exercises: [] } } }); setScreen("week"); }} />;

    if (screen === "day" && selDay !== null) {
        const assigned = d.weekPlan[selDay] || [];
        return (
            <div style={{ padding: "22px 16px 100px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                    <button onClick={() => setScreen("week")} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex" }}>{Ico.back}</button>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne'" }}>{DAYS_FULL[selDay]}</div>
                </div>
                <div style={{ fontSize: 11, color: T.sub, letterSpacing: 2, marginBottom: 12, fontFamily: "'JetBrains Mono'" }}>SELECT GROUPS</div>
                {Object.keys(d.groups).length === 0 && <div style={{ color: T.sub, fontSize: 14, padding: "24px 0", textAlign: "center" }}>Create groups first.</div>}
                {Object.entries(d.groups).map(([gid, g]) => {
                    const active = assigned.includes(gid);
                    return <div key={gid} onClick={() => { const next = active ? assigned.filter((id: string) => id !== gid) : [...assigned, gid]; save({ ...d, weekPlan: { ...d.weekPlan, [selDay]: next } }); }} style={{ padding: "14px 16px", borderRadius: 12, background: active ? T.accentDim : T.card, border: `1px solid ${active ? T.accentGlow : T.border}`, marginBottom: 8, display: "flex", alignItems: "center", cursor: "pointer" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${active ? T.accent : T.border}`, background: active ? T.accent : "none", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                            {active && Ico.check}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: active ? T.accent : T.text }}>{g.name}</div>
                    </div>;
                })}
            </div>
        );
    }

    if (screen === "group" && selGroup) {
        const g = d.groups[selGroup];
        return (
            <div style={{ padding: "22px 16px 100px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                    <button onClick={() => setScreen("week")} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex" }}>{Ico.back}</button>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne'", flex: 1 }}>{g.name}</div>
                    <button onClick={() => { const { [selGroup]: _, ...rest } = d.groups; const wp: Config["weekPlan"] = {}; Object.entries(d.weekPlan).forEach(([day, ids]) => { wp[Number(day)] = ids.filter((id: string) => id !== selGroup); }); save({ ...d, groups: rest, weekPlan: wp }); setScreen("week"); }} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex" }}>{Ico.trash}</button>
                </div>
                {(g.exercises || []).map((exId: string) => {
                    const ex = d.exercises[exId]; if (!ex) return null;
                    return <div key={exId} onClick={() => { setSelEx(exId); setScreen("exercise"); }} style={{ padding: "14px 16px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}`, marginBottom: 8, display: "flex", alignItems: "center", cursor: "pointer" }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{ex.name}</div>
                            <div style={{ fontSize: 11, color: T.sub, fontFamily: "'JetBrains Mono'", marginTop: 2 }}>{ex.sets.length} sets · {ex.sets.map((s: SetConfig) => `${s.weight}×${s.reps}`).join(", ")}</div>
                        </div>
                        <span style={{ color: T.sub }}>›</span>
                    </div>;
                })}
                <button onClick={() => { setSelEx("__new__"); setScreen("exercise"); }} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1px dashed ${T.borderHi}`, background: "none", color: T.sub, cursor: "pointer", fontSize: 14, fontFamily: "'Syne'", fontWeight: 700, letterSpacing: 1, marginTop: 4 }}>
                    + ADD EXERCISE
                </button>
            </div>
        );
    }

    if (screen === "exercise" && selEx && selGroup) {
        const isNew = selEx === "__new__";
        const existing = isNew ? undefined : d.exercises[selEx];
        return <ExerciseConfigScreen isNew={isNew} existing={existing} onBack={() => setScreen("group")}
            onDelete={() => { const { [selEx]: _, ...rest } = d.exercises; const g = d.groups[selGroup]; save({ ...d, exercises: rest, groups: { ...d.groups, [selGroup]: { ...g, exercises: g.exercises.filter((id: string) => id !== selEx) } } }); setScreen("group"); }}
            onSave={(name, sets) => { const exId = isNew ? uid() : selEx; const nextExs = { ...d.exercises, [exId]: { name, sets } }; const g = d.groups[selGroup]; const nextGroup = isNew ? { ...g, exercises: [...(g.exercises || []), exId] } : g; save({ ...d, exercises: nextExs, groups: { ...d.groups, [selGroup]: nextGroup } }); setScreen("group"); }} />;
    }
    return null;
}

// ─── HISTORY TAB ──────────────────────────────────────────────
function HistoryTab({ sessions }: { sessions: SessionData[] }) {
    const [exp, setExp] = useState<number | null>(null);
    if (!sessions.length) return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", gap: 14 }}>
            <div style={{ fontSize: 48 }}>📋</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne'" }}>No sessions yet</div>
            <div style={{ color: T.sub, fontSize: 14 }}>Complete a workout to see history.</div>
        </div>
    );
    return (
        <div style={{ padding: "22px 16px 100px" }}>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 22, fontFamily: "'Syne'" }}>History</div>
            {[...sessions].reverse().map((s, i) => (
                <div key={i} style={{ marginBottom: 10, borderRadius: 14, background: T.card, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                    <div onClick={() => setExp(exp === i ? null : i)} style={{ padding: 16, display: "flex", alignItems: "center", cursor: "pointer" }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>{s.groupName}</div>
                            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: T.sub, marginTop: 3 }}>{s.date}</div>
                        </div>
                        <span style={{ color: T.accent, fontFamily: "'JetBrains Mono'", fontSize: 14, fontWeight: 600 }}>{Math.round(s.totalVol || 0)} kg</span>
                    </div>
                    {exp === i && (
                        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${T.border}` }}>
                            {(s.exercises || []).map((ex, ei) => (
                                <div key={ei} style={{ padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{ex.name}</div>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        {(ex.sets || []).map((set, si) => (
                                            <span key={si} style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontFamily: "'JetBrains Mono'", background: set.done ? T.accentDim : T.faint, color: set.done ? T.accent : T.sub, border: `1px solid ${set.done ? T.accentGlow : T.border}` }}>
                                                {set.weight}×{set.reps}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function WorkoutPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tab, setTab] = useState<"workout" | "config" | "history">("workout");
    const [config, setConfig] = useState<Config>({ weekPlan: {}, groups: {}, exercises: {} });
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/");
        if (status === "authenticated") {
            Promise.all([api.getConfig(), api.getSessions()]).then(([cfg, ses]) => {
                if (cfg.config) setConfig(cfg.config);
                if (ses.sessions) setSessions(ses.sessions);
                setReady(true);
            });
        }
    }, [status, router]);

    const saveConfig = useCallback(async (next: Config) => {
        setConfig(next);
        await api.saveConfig(next);
    }, []);

    const saveSession = useCallback(async (sessionData: SessionData) => {
        await api.saveSession(sessionData);
        setSessions(prev => [...prev, sessionData]);
    }, []);

    if (status === "loading" || !ready) return (
        <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: T.accent, fontSize: 28, fontWeight: 800, letterSpacing: 8, fontFamily: "'Syne'" }}>GRIND</div>
        </div>
    );

    const NAV = [
        { id: "workout" as const, label: "WORKOUT", icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="9" width="18" height="4" rx="2" stroke="currentColor" strokeWidth="1.5" /><rect x="5" y="7" width="2" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="15" y="7" width="2" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" /></svg> },
        { id: "config" as const, label: "CONFIG", icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M11 4v2M11 16v2M4 11h2M16 11h2M6.1 6.1l1.4 1.4M14.5 14.5l1.4 1.4M6.1 15.9l1.4-1.4M14.5 7.5l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> },
        { id: "history" as const, label: "LOG", icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 6h14M4 11h10M4 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> },
    ];

    return (
        <div style={{ fontFamily: "'Syne', sans-serif", background: T.bg, minHeight: "100vh", color: T.text, maxWidth: 430, margin: "0 auto", position: "relative" }}>
            <style>{css}</style>
            <div style={{ position: "sticky", top: 0, zIndex: 20, background: T.bg, borderBottom: `1px solid ${T.border}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 4, color: T.accent }}>GRIND</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: T.sub, fontFamily: "'JetBrains Mono'" }}>{session?.user?.email}</span>
                    <button onClick={() => signOut({ callbackUrl: "/" })} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex", padding: 4 }}>{Ico.logout}</button>
                </div>
            </div>

            <div style={{ height: "calc(100vh - 49px)", overflowY: "auto", paddingBottom: 72 }}>
                {tab === "workout" && <WorkoutTab weekPlan={config.weekPlan} groups={config.groups} exercises={config.exercises} onSessionSave={saveSession} />}
                {tab === "config" && <ConfigTab weekPlan={config.weekPlan} groups={config.groups} exercises={config.exercises} onSave={saveConfig} />}
                {tab === "history" && <HistoryTab sessions={sessions} />}
            </div>

            <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#0F0F10", borderTop: `1px solid ${T.border}`, display: "flex", zIndex: 100 }}>
                {NAV.map(n => {
                    const active = tab === n.id;
                    return <button key={n.id} onClick={() => setTab(n.id)} style={{ flex: 1, padding: "10px 0 14px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: active ? T.accent : T.sub, transition: "color 0.2s" }}>
                        {n.icon}
                        <span style={{ fontSize: 9, letterSpacing: 1.5, fontWeight: 700 }}>{n.label}</span>
                        {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.accent, marginTop: -2, boxShadow: `0 0 6px ${T.accent}` }} />}
                    </button>;
                })}
            </nav>
        </div>
    );
}
