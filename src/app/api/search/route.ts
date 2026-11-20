import { searchCatalog } from "@/lib/catalog";
import { json } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  if (query.length < 1) return json({ artists: [], releases: [], tracks: [] });
  const results = await searchCatalog(query);
  return json(results);
}
