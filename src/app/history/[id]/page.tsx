import { AppHeader, PageShell } from "@/components/AppChrome";
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
    <PageShell>
      <AppHeader
        backHref="/history"
        backLabel="← History"
        action={
          !run.endedAt ? (
            <Link
              href={`/runs/${id}`}
              className="text-xs text-accent hover:underline"
            >
              Open live
            </Link>
          ) : null
        }
      />

      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">{run.presetName}</h1>
        <p className="mt-0.5 font-mono text-xs text-muted">
          {run.startedAt.toLocaleString()}
          {run.endedAt ? ` · ended ${run.endedAt.toLocaleString()}` : ""}
        </p>
      </div>

      <HistoryRunTree tree={tree} />
    </PageShell>
  );
}
