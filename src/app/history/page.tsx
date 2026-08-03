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
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-28 pt-6">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-200/50">
          Past activity
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-teal-50">
          History
        </h1>
      </header>

      <section className="space-y-3">
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-teal-100/50">
            No runs yet.
          </p>
        ) : (
          list.map((run) => (
            <Link
              key={run.id}
              href={`/history/${run.id}`}
              className="block rounded-2xl border border-white/10 bg-[#14201c]/90 px-4 py-4"
            >
              <div className="text-base font-semibold text-teal-50">
                {run.presetName}
              </div>
              <div className="mt-1 text-xs text-teal-100/45">
                {run.startedAt.toLocaleString()}
                {run.endedAt ? " · ended" : " · open"}
              </div>
              <div className="mt-2 text-xs text-amber-200/70">
                {Number(run.completedCount)} / {Number(run.timerCount)} timers
                completed
              </div>
            </Link>
          ))
        )}
      </section>

      <BottomNav active="history" />
    </main>
  );
}
