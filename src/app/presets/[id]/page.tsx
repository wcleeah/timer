import {
  deletePreset,
  renamePreset,
  startRunFromPreset,
} from "@/app/actions/presets";
import { PresetTreeEditor } from "@/components/PresetTreeEditor";
import { db } from "@/db";
import { presetNodes, presets } from "@/db/schema";
import { buildTree } from "@/lib/tree";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
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
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-10 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-teal-100/60">
          ← Presets
        </Link>
        <form action={remove}>
          <button
            type="submit"
            className="text-sm text-rose-200/80"
          >
            Delete
          </button>
        </form>
      </div>

      <form action={saveName} className="mb-4">
        <input
          name="name"
          defaultValue={preset.name}
          className="w-full bg-transparent text-2xl font-semibold tracking-tight text-teal-50 outline-none"
        />
        <button
          type="submit"
          className="mt-2 text-xs text-amber-200/80"
        >
          Save name
        </button>
      </form>

      <form action={startRun} className="mb-6">
        <button
          type="submit"
          className="w-full rounded-2xl bg-amber-400 py-4 text-base font-semibold text-[#13201b]"
        >
          Start run
        </button>
      </form>

      <PresetTreeEditor presetId={preset.id} tree={tree} />
    </main>
  );
}
