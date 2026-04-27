import type { Database } from "./database.types"

type PublicSchema = Database["public"]
type PublicTables = PublicSchema["Tables"]

export type TableName = keyof PublicTables

export type Row<T extends TableName> = PublicTables[T]["Row"]
export type InsertDto<T extends TableName> = PublicTables[T]["Insert"]
export type UpdateDto<T extends TableName> = PublicTables[T]["Update"]

export type TenantRow = Row<"tenants">
export type TenantMembershipRow = Row<"tenant_memberships">
export type KnowledgeItemRow = Row<"knowledge_items">
export type Nr1AssessmentRow = Row<"nr1_assessments">

export type Nr1CompanyRow = Row<"nr1_companies">
export type Nr1CompanyContactRow = Row<"nr1_company_contacts">
export type Nr1EstablishmentRow = Row<"nr1_establishments">
export type Nr1DepartmentRow = Row<"nr1_departments">
export type Nr1ActivityRow = Row<"nr1_activities">

export type Nr1DiagnosisSessionRow = Row<"nr1_diagnosis_sessions">
export type Nr1DiagnosisContextRow = Row<"nr1_diagnosis_context">
export type Nr1DiagnosisFqbRow = Row<"nr1_diagnosis_fqb">
export type Nr1DiagnosisAccidentsRow = Row<"nr1_diagnosis_accidents">
export type Nr1DiagnosisErgonomicsRow = Row<"nr1_diagnosis_ergonomics">
export type Nr1DiagnosisPsychosocialRow = Row<"nr1_diagnosis_psychosocial">
export type Nr1DiagnosisControlsRow = Row<"nr1_diagnosis_controls">
export type Nr1DiagnosisReviewRow = Row<"nr1_diagnosis_review">

export type Nr1RiskRow = Row<"nr1_risks">
export type Nr1ActionPlanRow = Row<"nr1_action_plans">
export type Nr1ActionFollowupRow = Row<"nr1_action_followups">

export type Nr1EvidenceItemRow = Row<"nr1_evidence_items">
export type Nr1DocumentVersionRow = Row<"nr1_document_versions">
export type Nr1GroCriteriaRow = Row<"nr1_gro_criteria">
export type Nr1ModuleSessionRow = Row<"nr1_module_sessions">
export type Nr1ReviewCycleRow = Row<"nr1_review_cycles">
export type Nr1AuditEventRow = Row<"nr1_audit_events">
export type Nr1DraftStateRow = Row<"nr1_draft_state">
export type Nr1TrainingRecordRow = Row<"nr1_training_records">
export type Nr1OccupationalHealthRefRow = Row<"nr1_occupational_health_refs">
export type Nr1ThirdPartyRow = Row<"nr1_third_parties">
export type Nr1WorkerParticipationLogRow = Row<"nr1_worker_participation_logs">

export type Nr1CompanyInsert = InsertDto<"nr1_companies">
export type Nr1CompanyUpdate = UpdateDto<"nr1_companies">

export type Nr1EstablishmentInsert = InsertDto<"nr1_establishments">
export type Nr1EstablishmentUpdate = UpdateDto<"nr1_establishments">

export type Nr1DepartmentInsert = InsertDto<"nr1_departments">
export type Nr1DepartmentUpdate = UpdateDto<"nr1_departments">

export type Nr1ActivityInsert = InsertDto<"nr1_activities">
export type Nr1ActivityUpdate = UpdateDto<"nr1_activities">

export type Nr1DiagnosisSessionInsert = InsertDto<"nr1_diagnosis_sessions">
export type Nr1DiagnosisSessionUpdate = UpdateDto<"nr1_diagnosis_sessions">

export type Nr1RiskInsert = InsertDto<"nr1_risks">
export type Nr1RiskUpdate = UpdateDto<"nr1_risks">

export type Nr1ActionPlanInsert = InsertDto<"nr1_action_plans">
export type Nr1ActionPlanUpdate = UpdateDto<"nr1_action_plans">

export type Nr1EvidenceItemInsert = InsertDto<"nr1_evidence_items">
export type Nr1EvidenceItemUpdate = UpdateDto<"nr1_evidence_items">

export type Nr1ReviewCycleInsert = InsertDto<"nr1_review_cycles">
export type Nr1ReviewCycleUpdate = UpdateDto<"nr1_review_cycles">

export type MembershipRole = TenantMembershipRow["role"]
export type Nr1RiskStatus = Nr1RiskRow["status"]
export type Nr1ActionStatus = Nr1ActionPlanRow["status"]
export type Nr1ActivityStatus = Nr1ActivityRow["status"]
export type Nr1DiagnosisStatus = Nr1DiagnosisSessionRow["overall_status"]
export type Nr1ReviewStatus = Nr1ReviewCycleRow["status"]

export type EstablishmentScoped = {
  tenant_id: string
  establishment_id: string
}

export type DepartmentScoped = EstablishmentScoped & {
  department_id: string
}

export type ActivityScoped = DepartmentScoped & {
  activity_id: string
}

export type DiagnosisScoped = ActivityScoped & {
  diagnosis_session_id: string
}

export const NR1_TABLES = {
  companies: "nr1_companies",
  companyContacts: "nr1_company_contacts",
  establishments: "nr1_establishments",
  departments: "nr1_departments",
  activities: "nr1_activities",
  diagnosisSessions: "nr1_diagnosis_sessions",
  diagnosisContext: "nr1_diagnosis_context",
  diagnosisFqb: "nr1_diagnosis_fqb",
  diagnosisAccidents: "nr1_diagnosis_accidents",
  diagnosisErgonomics: "nr1_diagnosis_ergonomics",
  diagnosisPsychosocial: "nr1_diagnosis_psychosocial",
  diagnosisControls: "nr1_diagnosis_controls",
  diagnosisReview: "nr1_diagnosis_review",
  risks: "nr1_risks",
  actionPlans: "nr1_action_plans",
  actionFollowups: "nr1_action_followups",
  evidenceItems: "nr1_evidence_items",
  documentVersions: "nr1_document_versions",
  groCriteria: "nr1_gro_criteria",
  moduleSessions: "nr1_module_sessions",
  occupationalHealthRefs: "nr1_occupational_health_refs",
  reviewCycles: "nr1_review_cycles",
  draftState: "nr1_draft_state",
  auditEvents: "nr1_audit_events",
  trainingRecords: "nr1_training_records",
  thirdParties: "nr1_third_parties",
  workerParticipationLogs: "nr1_worker_participation_logs",
} as const
export type Nr1DraftStateInsert = InsertDto<"nr1_draft_state">
export type Nr1DraftStateUpdate = Partial<Nr1DraftStateInsert>
export type Nr1AuditEventInsert = InsertDto<"nr1_audit_events">
export type Nr1AuditEventUpdate = Partial<Nr1AuditEventInsert>
