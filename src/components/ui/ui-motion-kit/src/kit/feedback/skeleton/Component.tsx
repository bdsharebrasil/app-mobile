import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/ui/Button";
import "./skeleton.css";
export interface SkeletonProps { loading: boolean; children: ReactNode; shimmer?: boolean; label?: string }
/** Content keeps its intrinsic layout while hidden; an absolute placeholder never changes it. */
export function Skeleton({ loading, children, shimmer = true, label = "Loading content…" }: SkeletonProps) {
  return <div className="skeleton-root" role="group" aria-busy={loading} aria-label={loading ? label : undefined} data-testid="skeleton-panel">
    <div className="skeleton-content" aria-hidden={loading || undefined} inert={loading} style={{ visibility: loading ? "hidden" : "visible", opacity: loading ? 0 : 1 }}>{children}</div>
    <div className={`skeleton-cover ${shimmer && loading ? "skeleton-shimmer" : ""}`} aria-hidden="true" style={{ opacity: loading ? 1 : 0, pointerEvents: "none" }}><div className="skeleton-avatar" /><div className="skeleton-lines"><i /><i /></div></div>
  </div>;
}
export function Playground() {
  const [loading, setLoading] = useState(false);
  const [shimmer, setShimmer] = useState(true);
  useEffect(() => { if (!loading) return; const id = setTimeout(() => setLoading(false), 1800); return () => clearTimeout(id); }, [loading]);
  return <div data-testid="skeleton-playground" className="w-full max-w-md space-y-4 text-ink">
    <div className="flex flex-wrap gap-3"><Button data-testid="skeleton-trigger" aria-disabled={loading} onClick={() => { if (!loading) setLoading(true); }}>Reload list</Button><Button variant="secondary" aria-pressed={shimmer} onClick={() => setShimmer(s => !s)}>Shimmer {shimmer ? "on" : "off"}</Button></div>
    <div data-testid="skeleton-list" className="space-y-3">{["Design review notes", "Notification preferences", "Release checklist"].map((title, i) => <Skeleton key={title} loading={loading} shimmer={shimmer}><div className="flex min-h-20 items-center gap-3 rounded-control border border-line bg-surface p-4"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-control bg-secondary text-sm">{i + 1}</span><div><h3 className="m-0 text-sm font-semibold">{title}</h3><p className="m-0 text-sm text-muted">Updated today</p></div></div></Skeleton>)}</div>
    <p role="status" className="min-h-6 text-sm text-muted">{loading ? "Loading documents…" : "3 documents ready."}</p>
  </div>;
}
