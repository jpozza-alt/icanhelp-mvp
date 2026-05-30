import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const QUERINO_PASINI_TENANT_ID = process.env.QUERINO_PASINI_TENANT_ID;

const schema = z.object({
  selected_package: z.enum(["essential", "strategic", "premium"]),
  recommended_package: z.enum(["essential", "strategic", "premium"]),
  package_recommendation_reason: z.string().max(1000).optional().default(""),
  vacancy_complexity_level: z.enum(["standard", "strategic", "unknown"]).default("standard"),
  package_override_reason: z.string().max(1000).optional().default(""),
  vacancy_information_status: z.enum(["complete", "partial", "none"]).default("partial"),

  company_legal_name: z.string().max(240).optional().default(""),
  company_trade_name: z.string().max(240).optional().default(""),
  company_cnpj: z.string().max(32).optional().default(""),
  company_address: z.string().max(500).optional().default(""),

  requester_name: z.string().min(2).max(180),
  requester_role_title: z.string().max(180).optional().default(""),
  requester_cpf: z.string().max(32).optional().default(""),
  requester_email: z.string().email().max(240),
  requester_phone: z.string().max(80).optional().default(""),
  copy_email: z.string().email().max(240).optional().or(z.literal("")).default(""),

  job_title: z.string().min(2).max(180),
  department_name: z.string().max(180).optional().default(""),
  position_count: z.coerce.number().int().positive().max(999).default(1),
  hiring_reason: z.string().max(1000).optional().default(""),
  employment_type: z.string().max(120).optional().default(""),
  work_model: z.string().max(120).optional().default(""),
  work_schedule: z.string().max(240).optional().default(""),
  salary_range: z.string().max(160).optional().default(""),
  benefits: z.string().max(2000).optional().default(""),
  benefits_notes: z.string().max(2000).optional().default(""),

  main_activities: z.string().max(4000).optional().default(""),
  required_experience: z.string().max(3000).optional().default(""),
  required_education: z.string().max(2000).optional().default(""),
  technical_skills: z.string().max(3000).optional().default(""),
  systems_tools_equipment: z.string().max(3000).optional().default(""),
  behavioral_profile: z.string().max(3000).optional().default(""),
  elimination_criteria: z.string().max(3000).optional().default(""),
  desirable_criteria: z.string().max(3000).optional().default(""),
  has_job_description: z.boolean().default(false),
  job_description_attachment: z.string().max(500).optional().default(""),

  additional_services: z.string().max(3000).optional().default(""),
  recruitment_model: z.string().max(120).optional().default(""),
  approved_price: z.union([z.string(), z.number()]).optional().default(""),
  payment_terms: z
    .enum(["avista", "50_50", "outra_condicao_negociada"])
    .optional()
    .or(z.literal(""))
    .default(""),

  mandatory_declarations: z.array(z.literal("analysis_authorization")).min(1),
  final_confirmation: z.literal(true),
  lgpd_acceptance: z.literal(true),
  terms_acceptance: z.literal(true),

  acceptance_name: z.string().min(2).max(180),
  acceptance_cpf: z.string().max(32).optional().default(""),
  acceptance_role_title: z.string().max(180).optional().default(""),
  acceptance_email: z.string().email().max(240),
  acceptance_date: z.string().min(8).max(20),

  govbr_signature_status: z
    .enum([
      "pending_pdf_generation",
      "pending_govbr_signature",
      "signed_received",
      "signature_rejected",
      "not_applicable",
    ])
    .optional()
    .default("not_applicable"),

  signed_proposal_file: z.string().max(500).optional().default(""),
});

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const privilegedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !privilegedKey || !QUERINO_PASINI_TENANT_ID) {
    return NextResponse.json(
      { ok: false, error: "Server configuration is incomplete." },
      { status: 500 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalido." },
      { status: 400 },
    );
  }

  const validation = schema.safeParse(body);

  if (!validation.success) {
    const invalidFields = validation.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean);

    const uniqueFields = Array.from(new Set(invalidFields));

    return NextResponse.json(
      {
        ok: false,
        error:
          uniqueFields.length > 0
            ? `Dados invalidos. Revise: ${uniqueFields.join(", ")}.`
            : "Dados invalidos. Revise os campos obrigatorios.",
      },
      { status: 400 },
    );
  }

  const parsed = validation.data;

  const approvedPrice =
    typeof parsed.approved_price === "number"
      ? parsed.approved_price
      : parsed.approved_price
        ? Number(String(parsed.approved_price).replace(",", "."))
        : null;

  const supabase = createClient(supabaseUrl, privilegedKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const submittedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("pasini_recruitment_requests")
    .insert({
      tenant_id: QUERINO_PASINI_TENANT_ID,
      source: "public_landing",
      status: "proposal_draft_pending_consultancy_review",

      selected_package: parsed.selected_package,
      recommended_package: parsed.recommended_package,
      package_recommendation_reason: parsed.package_recommendation_reason || null,
      vacancy_complexity_level: parsed.vacancy_complexity_level,
      package_override_reason: parsed.package_override_reason || null,
      vacancy_information_status: parsed.vacancy_information_status,

      company_legal_name: parsed.company_legal_name || null,
      company_trade_name: parsed.company_trade_name || null,
      company_cnpj: parsed.company_cnpj || null,
      company_address: parsed.company_address || null,

      requester_name: parsed.requester_name,
      requester_role_title: parsed.requester_role_title || null,
      requester_cpf: parsed.requester_cpf || null,
      requester_email: parsed.requester_email,
      requester_phone: parsed.requester_phone || null,
      copy_email: parsed.copy_email || null,

      job_title: parsed.job_title,
      department_name: parsed.department_name || null,
      position_count: parsed.position_count,
      hiring_reason: parsed.hiring_reason || null,
      employment_type: parsed.employment_type || null,
      work_model: parsed.work_model || null,
      work_schedule: parsed.work_schedule || null,
      salary_range: parsed.salary_range || null,
      benefits: parsed.benefits || null,
      benefits_notes: parsed.benefits_notes || null,

      main_activities: parsed.main_activities || null,
      required_experience: parsed.required_experience || null,
      required_education: parsed.required_education || null,
      technical_skills: parsed.technical_skills || null,
      systems_tools_equipment: parsed.systems_tools_equipment || null,
      behavioral_profile: parsed.behavioral_profile || null,
      elimination_criteria: parsed.elimination_criteria || null,
      desirable_criteria: parsed.desirable_criteria || null,
      has_job_description: parsed.has_job_description,
      job_description_attachment: parsed.job_description_attachment || null,

      additional_services: parsed.additional_services || null,
      recruitment_model: parsed.recruitment_model || null,
      approved_price: Number.isFinite(approvedPrice) ? approvedPrice : null,
      payment_terms: parsed.payment_terms || null,

      mandatory_declarations: parsed.mandatory_declarations,
      final_confirmation: true,
      lgpd_acceptance: true,
      terms_acceptance: true,
      acceptance_name: parsed.acceptance_name,
      acceptance_cpf: parsed.acceptance_cpf || null,
      acceptance_role_title: parsed.acceptance_role_title || null,
      acceptance_email: parsed.acceptance_email,
      acceptance_date: parsed.acceptance_date,
      accepted_at: submittedAt,

      govbr_signature_status: "not_applicable",
      signed_proposal_file: null,

      payload_json: {
        source_form: "pasini_recruitment_landing",
        submitted_at: submittedAt,
        version: 4,
        contracting_model: "analysis_request_only",
        selected_package: parsed.selected_package,
        recommended_package: parsed.recommended_package,
        vacancy_complexity_level: parsed.vacancy_complexity_level,
        vacancy_information_status: parsed.vacancy_information_status,
        request_status: "proposal_draft_pending_consultancy_review",
        govbr_signature_status: "not_applicable",
      },
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel registrar a solicitacao." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    request_id: data.id,
    status: "proposal_draft_pending_consultancy_review",
    govbr_signature_status: "not_applicable",
  });
}



