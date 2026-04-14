import { NextRequest, NextResponse } from "next/server";

function getRequestId() {
  return "req_" + Date.now().toString();
}

function getTenantId(request: NextRequest) {
  return request.headers.get("x-icanhelp-tenant") || "";
}

function getAuthHeader(request: NextRequest) {
  return request.headers.get("authorization") || "";
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId();
  const tenantId = getTenantId(request);
  const authHeader = getAuthHeader(request);

  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        ok: false,
        request_id: requestId,
        error: "unauthorized",
        message: "Missing bearer token.",
      },
      { status: 401 }
    );
  }

  if (!tenantId) {
    return NextResponse.json(
      {
        ok: false,
        request_id: requestId,
        error: "validation_error",
        message: "Missing x-icanhelp-tenant header.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      request_id: requestId,
      items: [],
      note: "NR1 list route scaffold created. Persistence integration pending.",
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  const tenantId = getTenantId(request);
  const authHeader = getAuthHeader(request);

  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        ok: false,
        request_id: requestId,
        error: "unauthorized",
        message: "Missing bearer token.",
      },
      { status: 401 }
    );
  }

  if (!tenantId) {
    return NextResponse.json(
      {
        ok: false,
        request_id: requestId,
        error: "validation_error",
        message: "Missing x-icanhelp-tenant header.",
      },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      {
        ok: false,
        request_id: requestId,
        error: "validation_error",
        message: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      request_id: requestId,
      item: {
        id: "stub",
        tenant_id: tenantId,
        establishment_name: body.establishment_name || null,
        activity_name: body.activity_name || null,
        risk_category: body.risk_category || null,
        hazard_title: body.hazard_title || null,
        status: body.status || "draft",
      },
      note: "NR1 create route scaffold created. Persistence integration pending.",
    },
    { status: 201 }
  );
}