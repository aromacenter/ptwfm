import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { recordAudit } from "@/lib/gdpr/audit";
import {
  INTEGRATION_KEYS,
  isIntegrationKey,
  getIntegrationStatus,
  setSetting,
} from "@/lib/settings";

export const runtime = "nodejs";

const bodySchema = z.object({
  key: z.string().min(1),
  value: z.string(), // empty string clears the setting
});

// List integration settings (secrets masked).
export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ integrations: await getIntegrationStatus() });
}

// Set or clear a single integration value.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isIntegrationKey(parsed.data.key)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { key, value } = parsed.data;

  await setSetting(key, value, INTEGRATION_KEYS[key].secret);
  await recordAudit({
    actorId: user!.id,
    action: "SETTING_UPDATE",
    entity: "Setting",
    entityId: key,
    metadata: { changed: key, cleared: value === "" },
  });

  return NextResponse.json({ ok: true });
}
