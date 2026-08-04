import type { RunNode } from "@/db/schema";
import {
  formatDuration,
  formatModeLabel,
  isCountdownLike,
} from "@/lib/timer-math";
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
      <div style={{ marginLeft: Math.min(depth, 4) * 10 }}>
        <div className="border-b border-border px-3 py-2 text-sm font-medium">
          {node.name}
        </div>
        {node.children.map((child) => (
          <ReadOnlyNode key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  const time = isCountdownLike(node.mode)
    ? formatDuration(node.remainingMs ?? node.durationMs ?? 0)
    : formatDuration(node.elapsedMs ?? 0);

  const modeLabel = formatModeLabel(node.mode);
  const cycles =
    node.mode === "recurring" ? ` · ×${node.cycleCount ?? 0}` : "";

  return (
    <div
      style={{ marginLeft: Math.min(depth, 4) * 10 }}
      className="border-b border-border px-3 py-2.5"
    >
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-medium">{node.name}</h3>
        <span
          className="font-mono text-[10px] uppercase text-muted"
          title={node.mode === "recurring" ? "Recurring" : undefined}
        >
          {node.status} · {modeLabel}
          {cycles}
        </span>
      </div>
      <p className="font-mono text-xl tabular-nums text-code">{time}</p>
      {node.note ? (
        <p className="mt-1 whitespace-pre-wrap text-xs text-muted">{node.note}</p>
      ) : null}
    </div>
  );
}

export function HistoryRunTree({ tree }: { tree: TreeNode<RunNode>[] }) {
  if (tree.length === 0) {
    return <p className="text-sm text-muted">No timers in this run.</p>;
  }
  return (
    <div className="overflow-hidden rounded-md border border-border">
      {tree.map((node) => (
        <ReadOnlyNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}
