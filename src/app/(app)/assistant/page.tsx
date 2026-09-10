import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Assistant } from "@/components/Assistant";
import { Panel } from "@/components/ui";
import { env } from "@/lib/env";
import { fmt } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const user = await requireUser();
  const actions = await prisma.aiAction.findMany({
    where: { actorUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Assistant</h1>
        <p className="mt-1 text-sm text-muted">
          {env.anthropicKey
            ? "Reads live company data through a fixed set of approved functions. It has no direct database access."
            : "Not configured yet — add ANTHROPIC_API_KEY to your environment and restart to switch it on."}
        </p>
      </header>

      <Assistant canApprove={user.role === "CEO"} />

      <Panel title="What the assistant did" aside={<span className="text-xs text-muted">last 15 calls</span>}>
        <ul className="divide-y divide-rule text-sm">
          {actions.length === 0 && <li className="px-[18px] py-5 text-muted">No calls logged yet.</li>}
          {actions.map((action) => (
            <li key={action.id} className="px-[18px] py-2.5">
              {action.tool.replace(/_/g, " ")}
              <span className="ml-2 text-xs text-muted">
                {action.status.toLowerCase().replace(/_/g, " ")} · {fmt(action.createdAt)}
              </span>
              {action.error && <span className="block text-xs text-blocked">{action.error}</span>}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
