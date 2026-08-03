import { HistoryRunTree } from "@/components/HistoryRunTree";
import { db } from "@/db";
import { runNodes, runs } from "@/db/schema";
import { buildTree } from "@/lib/tree";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [run] = await db.select().from(runs).where(eq(runs.id, id));
  if (!run) notFound();

  const nodes = await db
    .select()
    .from(runNodes)
    .where(eq(runNodes.runId, id))
    .orderBy(asc(runNodes.sortOrder));
  const tree = buildTree(nodes);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-10 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/history" className="text-sm text-teal-100/60">
          ← History
        </Link>
        {!run.endedAt ? (
          <Link href={`/runs/${id}`} className="text-sm text-amber-200/80">
            Open live run
          </Link>
        ) : null}
      </div>

      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-teal-200/45">
          Read-only
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-teal-50">
          {run.presetName}
        </h1>
        <p className="mt-1 text-xs text-teal-100/45">
          Started {run.startedAt.toLocaleString()}
          {run.endedAt ? ` · ended ${run.endedAt.toLocaleString()}` : ""}
        </p>
      </header>

      <HistoryRunTree tree={tree} />
    </main>
  );
}
