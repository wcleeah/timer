import { PresetDetail } from "@/components/PresetDetail";
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

  return (
    <PresetDetail
      presetId={preset.id}
      initialName={preset.name}
      tree={tree}
    />
  );
}
