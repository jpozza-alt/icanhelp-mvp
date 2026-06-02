import { createClient } from "@supabase/supabase-js";
import { renderToStream } from "@react-pdf/renderer";
import { createElement } from "react";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  PasiniProposalPdfDocument,
  type PasiniProposalPdfRecord,
} from "@/lib/pasini/proposal-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params:
    | {
        id: string;
      }
    | Promise<{
        id: string;
      }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function getLogoDataUri() {
  try {
    const logoPath = path.join(
      process.cwd(),
      "public",
      "brand",
      "querino-pasini-logo-idv-transparent.png",
    );

    const logo = await fs.readFile(logoPath);
    return "data:image/png;base64," + logo.toString("base64");
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const requestId = params.id;

  if (!requestId || !isUuid(requestId)) {
    return jsonError("Identificador invalido.", 400);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const privilegedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tenantId = process.env.QUERINO_PASINI_TENANT_ID;

  if (!supabaseUrl || !anonKey || !privilegedKey || !tenantId) {
    return jsonError("Server configuration is incomplete.", 500);
  }

  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return jsonError("Acesso nao autorizado.", 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData } = await authClient.auth.getUser();

  if (!userData.user) {
    return jsonError("Acesso nao autorizado.", 401);
  }

  const adminClient = createClient(supabaseUrl, privilegedKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: membership } = await adminClient
    .from("tenant_memberships")
    .select("id, role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!membership) {
    return jsonError("Acesso negado.", 403);
  }

  const { data: record, error } = await adminClient
    .from("pasini_recruitment_requests")
    .select("*")
    .eq("id", requestId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !record) {
    return jsonError("Solicitacao nao encontrada.", 404);
  }

  const logoDataUri = await getLogoDataUri();

  const pdfElement = createElement(PasiniProposalPdfDocument, {
    record: record as PasiniProposalPdfRecord,
    logoDataUri,
  }) as unknown as Parameters<typeof renderToStream>[0];

  const pdfStream = await renderToStream(pdfElement);

  const shortId = requestId.slice(0, 8);
  const filename = `minuta-proposta-querino-pasini-${shortId}.pdf`;

  return new Response(pdfStream as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}


