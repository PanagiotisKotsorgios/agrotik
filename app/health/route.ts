export const dynamic = "force-dynamic";

import { healthResponse } from "@/lib/health";

export async function GET() {
  return healthResponse();
}
