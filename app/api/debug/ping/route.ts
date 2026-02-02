import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BUILD_STAMP = "20260202-205358";

export async function GET() {
  const res = NextResponse.json({
    ok: true,
    location: "ROOT/app/api/debug/ping",
    build: BUILD_STAMP,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
    now: new Date().toISOString(),
  });

  res.headers.set("x-icanhelp-build", BUILD_STAMP);
  res.headers.set("x-icanhelp-commit", process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown");
  return res;
}
