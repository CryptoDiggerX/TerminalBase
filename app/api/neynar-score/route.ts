import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const fid = req.nextUrl.searchParams.get("fid");
  if (!fid) {
    return NextResponse.json({ error: "fid is required" }, { status: 400 });
  }

  const apiKey = process.env.NEYNAR_API_KEY || "5BCD4BEB-5420-4B8E-A3D1-C2F7ADCA4171";

  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          "x-api-key": apiKey,
          accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Neynar lookup failed" }, { status: 502 });
    }

    const data = await res.json();
    const user = data?.users?.[0];
    const score =
      user?.experimental?.neynar_user_score ??
      user?.score ??
      0;

    return NextResponse.json({ score, fid: Number(fid) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch score" }, { status: 500 });
  }
}
