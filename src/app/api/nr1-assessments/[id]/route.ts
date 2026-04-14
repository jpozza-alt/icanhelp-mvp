import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getRequestId() {
  return "req_" + Date.now().toString();
}

function getTenantId(request: NextRequest) {
  return request.headers.get("x-icanhelp-tenant") || "";
}

function getAuthHeader(request: NextRequest) {
  return request.headers.get("authorization") || "";
}

async function getId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId();
  const tenantId = getTenantId(request);
  const authHeader = getAuthHeader(request);
  const id = await getId(context);

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
      item: {
        id,
        tenant_id: tenantId,
        status: "draft",
      },
      note: "NR1 item read route scaffold created. Persistence integration pending.",
    },
    { status: 200 }
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId();
  const tenantId = getTenantId(request);
  const authHeader = getAuthHeader(request);
  const id = await getId(context);

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
        id,
        tenant_id: tenantId,
        status: body.status || "draft",
      },
      note: "NR1 item update route scaffold created. Persistence integration pending.",
    },
    { status: 200 }
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId();
  const tenantId = getTenantId(request);
  const authHeader = getAuthHeader(request);
  const id = await getId(context);

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
      id,
      note: "NR1 item delete route scaffold created. Soft delete integration pending.",
    },
    { status: 200 }
  );
}