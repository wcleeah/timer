import type { RunNode } from "@/db/schema";
import { formatDuration } from "@/lib/timer-math";
import type { TreeNode } from "@/lib/tree";

function ReadOnlyNode({
  node,
  depth,
}: {
  node: TreeNode<RunNode>;
  depth: number;
}) {
  if (node.kind === "group") {
    return (
      <div style={{ marginLeft: Math.min(depth, 4) * 12 }} className="space-y-2">
        <div className="rounded-xl border border-teal-400/15 bg-teal-950/30 px-3 py-2 text-sm font-semibold text-teal-100">
          {node.name}
        </div>
        {node.children.map((child) => (
          <ReadOnlyNode key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  const time =
    node.mode === "countdown"
      ? formatDuration(node.remainingMs ?? node.durationMs ?? 0)
      : formatDuration(node.elapsedMs ?? 0);

  return (
    <div
      style={{ marginLeft: Math.min(depth, 4) * 12 }}
      className="rounded-2xl border border-white/10 bg-[#14201c] p-4"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-teal-50">{node.name}</h3>
        <span className="text-[10px] uppercase tracking-wider text-teal-100/50">
          {node.status} · {node.mode}
        </span>
      </div>
      <p className="font-[family-name:var(--font-timer)] text-3xl tabular-nums text-amber-100">
        {time}
      </p>
      {node.note ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-teal-100/65">
          {node.note}
        </p>
      ) : null}
    </div>
  );
}

export function HistoryRunTree({ tree }: { tree: TreeNode<RunNode>[] }) {
  if (tree.length === 0) {
    return (
      <p className="text-sm text-teal-100/50">No timers in this run.</p>
    );
  }
  return (
    <div className="space-y-3">
      {tree.map((node) => (
        <ReadOnlyNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}
