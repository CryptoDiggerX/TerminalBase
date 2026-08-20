import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

const KEY_PREFIX = "tbase:reg:";

export async function GET(req: NextRequest) {
  const fid = req.nextUrl.searchParams.get("fid");
  if (!fid) return NextResponse.json({ error: "fid is required" }, { status: 400 });

  const entry = await redis.get(`${KEY_PREFIX}${fid}`);
  return NextResponse.json({ registered: !!entry, entry: entry || null });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fid, username, address, score, tier, allocation, signature, message, txHash } = body;

    if (!fid || !address || !txHash || !signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await redis.get(`${KEY_PREFIX}${fid}`);
    if (existing) {
      return NextResponse.json({ error: "Already registered", entry: existing }, { status: 409 });
    }

    const entry = {
      fid,
      username: username || null,
      address,
      score,
      tier,
      allocation,
      signature,
      message,
      txHash,
      registeredAt: new Date().toISOString(),
    };

    await redis.set(`${KEY_PREFIX}${fid}`, entry);
    await redis.sadd("tbase:reg:all", fid);

    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save registration" }, { status: 500 });
  }
}
