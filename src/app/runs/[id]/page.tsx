import { endRun } from "@/app/actions/runs";
import { AppHeader, PageShell } from "@/components/AppChrome";
import { RunView } from "@/components/RunView";
import { db } from "@/db";
import { runNodes, runs } from "@/db/schema";
import { buildTree } from "@/lib/tree";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RunPage({
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

  async function finish() {
    "use server";
    await endRun(id);
  }

  return (
    <PageShell>
      <AppHeader
        backHref="/"
        backLabel="← Presets"
        action={
          <Link
            href={`/history/${id}`}
            className="text-xs text-muted hover:text-foreground"
          >
            History
          </Link>
        }
      />

      <div className="mb-3">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {run.presetName}
          </h1>
          <span className="shrink-0 font-mono text-xs text-muted">run</span>
        </div>
        <p className="mt-0.5 font-mono text-xs text-muted">
          {run.startedAt.toLocaleString()}
        </p>
      </div>

      <RunView tree={tree} />

      <form action={finish} className="mt-6">
        <button
          type="submit"
          className="w-full rounded-md border border-border py-2 text-sm text-muted hover:bg-surface hover:text-foreground"
        >
          End run
        </button>
      </form>
    </PageShell>
  );
}
