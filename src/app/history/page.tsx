import { AppHeader, PageShell } from "@/components/AppChrome";
import { BottomNav } from "@/components/BottomNav";
import { db } from "@/db";
import { runNodes, runs } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const list = await db
    .select({
      id: runs.id,
      presetName: runs.presetName,
      startedAt: runs.startedAt,
      endedAt: runs.endedAt,
      timerCount: sql<number>`coalesce(sum(case when ${runNodes.kind} = 'timer' then 1 else 0 end), 0)`,
      completedCount: sql<number>`coalesce(sum(case when ${runNodes.status} = 'completed' then 1 else 0 end), 0)`,
    })
    .from(runs)
    .leftJoin(runNodes, eq(runNodes.runId, runs.id))
    .groupBy(runs.id)
    .orderBy(desc(runs.startedAt));

  return (
    <PageShell withNav>
      <AppHeader />

      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">History</h1>
        <p className="mt-0.5 text-sm text-muted">Past runs, read-only.</p>
      </div>

      <section className="overflow-hidden rounded-md border border-border">
        {list.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted">No runs yet.</p>
        ) : (
          list.map((run, i) => (
            <Link
              key={run.id}
              href={`/history/${run.id}`}
              className={`block px-3 py-2.5 hover:bg-surface ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium">
                  {run.presetName}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {Number(run.completedCount)}/{Number(run.timerCount)}
                </span>
              </div>
              <div className="mt-0.5 font-mono text-xs text-muted">
                {run.startedAt.toLocaleString()}
                {run.endedAt ? " · ended" : " · open"}
              </div>
            </Link>
          ))
        )}
      </section>

      <BottomNav active="history" />
    </PageShell>
  );
}
