import { endRun } from "@/app/actions/runs";
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
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-10 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-teal-100/60">
          ← Presets
        </Link>
        <Link href={`/history/${id}`} className="text-sm text-teal-100/60">
          History view
        </Link>
      </div>

      <header className="mb-5">
        <p className="text-xs uppercase tracking-[0.18em] text-teal-200/45">
          Active run
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-teal-50">
          {run.presetName}
        </h1>
        <p className="mt-1 text-xs text-teal-100/45">
          Started {run.startedAt.toLocaleString()}
        </p>
      </header>

      <RunView tree={tree} />

      <form action={finish} className="mt-8">
        <button
          type="submit"
          className="w-full rounded-2xl border border-white/10 py-3 text-sm text-teal-100/70"
        >
          End run
        </button>
      </form>
    </main>
  );
}
