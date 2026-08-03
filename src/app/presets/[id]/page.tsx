import {
  deletePreset,
  renamePreset,
  startRunFromPreset,
} from "@/app/actions/presets";
import { AppHeader, PageShell } from "@/components/AppChrome";
import { PresetTreeEditor } from "@/components/PresetTreeEditor";
import { db } from "@/db";
import { presetNodes, presets } from "@/db/schema";
import { buildTree } from "@/lib/tree";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PresetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [preset] = await db.select().from(presets).where(eq(presets.id, id));
  if (!preset) notFound();

  const nodes = await db
    .select()
    .from(presetNodes)
    .where(eq(presetNodes.presetId, id))
    .orderBy(asc(presetNodes.sortOrder));
  const tree = buildTree(nodes);

  async function saveName(formData: FormData) {
    "use server";
    await renamePreset(id, String(formData.get("name") || ""));
  }

  async function remove() {
    "use server";
    await deletePreset(id);
  }

  async function startRun() {
    "use server";
    await startRunFromPreset(id);
  }

  return (
    <PageShell>
      <AppHeader
        backHref="/"
        backLabel="← Presets"
        action={
          <form action={remove}>
            <button
              type="submit"
              className="text-xs text-danger hover:underline"
            >
              Delete
            </button>
          </form>
        }
      />

      <form action={saveName} className="mb-3 flex items-center gap-2">
        <input
          name="name"
          defaultValue={preset.name}
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold tracking-tight outline-none"
        />
        <button
          type="submit"
          className="shrink-0 text-xs text-accent hover:underline"
        >
          Save
        </button>
      </form>

      <form action={startRun} className="mb-4">
        <button
          type="submit"
          className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-accent-fg"
        >
          Start run
        </button>
      </form>

      <PresetTreeEditor presetId={preset.id} tree={tree} />
    </PageShell>
  );
}
