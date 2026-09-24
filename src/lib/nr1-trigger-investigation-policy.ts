import type { TriggerInvestigationType } from "@/lib/nr1-trigger-investigation-matrix"

export type TriggerQuestionRole =
  | "context"
  | "exposure"
  | "frequency"
  | "control"
  | "impact"
  | "evidence"
  | "critical"

export type TriggerQuestionPolicy = {
  adverseWhen?: "yes" | "no"
  roles: TriggerQuestionRole[]
  criticalWhen?: "yes"
  technicalValidationWhen?: "yes" | "no"
  contextualOnly?: boolean
}

export type TriggerInvestigationPolicy = Record<
  TriggerInvestigationType,
  Record<string, TriggerQuestionPolicy>
>

function policy(
  roles: TriggerQuestionRole[],
  options: Omit<TriggerQuestionPolicy, "roles"> = {},
): TriggerQuestionPolicy {
  return {
    roles,
    ...options,
  }
}

export const TRIGGER_INVESTIGATION_POLICY: TriggerInvestigationPolicy = {
  deadline_pressure: {
    goals_clear: policy(["control"], { adverseWhen: "no" }),
    deadlines_feasible: policy(["exposure"], { adverseWhen: "no" }),
    staffing_sufficient: policy(["control"], { adverseWhen: "no" }),
    frequent_overtime: policy(["frequency", "impact"], { adverseWhen: "yes" }),
    breaks_respected: policy(["control"], { adverseWhen: "no" }),
    leadership_prioritizes: policy(["control"], { adverseWhen: "no" }),
    pressure_respectful: policy(["control"], { adverseWhen: "no" }),
    aggressive_pressure: policy(
      ["impact", "critical"],
      {
        adverseWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
    frequent_rework: policy(["impact"], { adverseWhen: "yes" }),
    related_events: policy(
      ["evidence", "impact"],
      { adverseWhen: "yes" },
    ),
  },

  public_service: {
    public_contact_frequent: policy(
      ["exposure", "frequency"],
      { adverseWhen: "yes" },
    ),
    works_alone: policy(["exposure"], { adverseWhen: "yes" }),
    queue_pressure: policy(
      ["exposure", "frequency"],
      { adverseWhen: "yes" },
    ),
    public_conflict: policy(["impact"], { adverseWhen: "yes" }),
    verbal_aggression: policy(
      ["impact", "critical"],
      {
        adverseWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
    threat_history: policy(
      ["evidence", "critical"],
      {
        adverseWhen: "yes",
        criticalWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
    physical_aggression: policy(
      ["evidence", "critical"],
      {
        adverseWhen: "yes",
        criticalWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
    difficult_situation_protocol: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    leadership_support: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    occurrence_records: policy(
      ["evidence"],
      { adverseWhen: "yes" },
    ),
  },

  remote_or_hybrid_work: {
    long_isolation: policy(
      ["exposure", "frequency"],
      { adverseWhen: "yes" },
    ),
    team_communication_difficulty: policy(
      ["impact"],
      { adverseWhen: "yes" },
    ),
    leadership_access_difficulty: policy(
      ["control"],
      { adverseWhen: "yes" },
    ),
    after_hours_messages: policy(
      ["frequency", "impact"],
      { adverseWhen: "yes" },
    ),
    permanent_availability: policy(
      ["exposure", "frequency"],
      { adverseWhen: "yes" },
    ),
    workday_control: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    breaks_ergonomics_guidance: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    work_conditions_monitoring: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    isolation_overload_conflict: policy(
      ["evidence", "impact"],
      { adverseWhen: "yes" },
    ),
    remote_support_measures: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
  },

  third_parties: {
    same_workplace: policy(
      ["context", "exposure"],
      { adverseWhen: "yes" },
    ),
    third_party_activities: policy(
      ["context"],
      { contextualOnly: true },
    ),
    shared_risks: policy(
      ["exposure"],
      { adverseWhen: "yes" },
    ),
    integrated_prevention: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    responsible_defined: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    risk_communication: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    combined_measures_evidence: policy(
      ["control", "evidence"],
      { adverseWhen: "no" },
    ),
    simultaneous_activities: policy(
      ["exposure"],
      { adverseWhen: "yes" },
    ),
    responsibility_conflict: policy(
      ["impact"],
      { adverseWhen: "yes" },
    ),
    third_party_incidents: policy(
      ["evidence", "impact"],
      { adverseWhen: "yes" },
    ),
  },

  repetitive_work: {
    daily_repetition: policy(
      ["frequency", "exposure"],
      { adverseWhen: "yes" },
    ),
    large_shift_share: policy(
      ["frequency", "exposure"],
      { adverseWhen: "yes" },
    ),
    sufficient_breaks: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    task_rotation: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    intense_pace: policy(
      ["exposure"],
      { adverseWhen: "yes" },
    ),
    force_pressure_twisting: policy(
      ["exposure"],
      { adverseWhen: "yes" },
    ),
    pain_discomfort: policy(
      ["evidence", "impact"],
      { adverseWhen: "yes" },
    ),
    preliminary_ergonomic_assessment: policy(
      ["control", "evidence"],
      { adverseWhen: "no" },
    ),
    existing_controls: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    controls_effective: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
  },

  prolonged_sitting: {
    many_hours_sitting: policy(
      ["frequency", "exposure"],
      { adverseWhen: "yes" },
    ),
    postural_breaks: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    adequate_chair: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    adequate_desk: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    adequate_monitor: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    foot_support: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    pain_discomfort: policy(
      ["evidence", "impact"],
      { adverseWhen: "yes" },
    ),
    posture_guidance: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    preliminary_ergonomic_assessment: policy(
      ["control", "evidence"],
      { adverseWhen: "no" },
    ),
    workstation_adjustments: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
  },

  intermediate_leadership: {
    leadership_roles_clear: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    knows_who_to_contact: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    leadership_problem_support: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    leadership_communication_clear: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    leadership_conflicts: policy(
      ["impact"],
      { adverseWhen: "yes" },
    ),
    aggressive_humiliating_pressure: policy(
      ["impact", "critical"],
      {
        adverseWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
    unequal_treatment: policy(
      ["impact"],
      { adverseWhen: "yes" },
    ),
    priority_feedback_missing: policy(
      ["control"],
      { adverseWhen: "yes" },
    ),
    report_channel: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    management_related_events: policy(
      ["evidence", "impact"],
      { adverseWhen: "yes" },
    ),
  },

  frequent_changes: {
    advance_communication: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    sufficient_guidance: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    change_training: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    workload_after_change: policy(
      ["impact"],
      { adverseWhen: "yes" },
    ),
    responsibility_confusion: policy(
      ["impact"],
      { adverseWhen: "yes" },
    ),
    rework_from_poor_guidance: policy(
      ["impact"],
      { adverseWhen: "yes" },
    ),
    recurring_resistance_conflict: policy(
      ["impact"],
      { adverseWhen: "yes" },
    ),
    post_change_followup: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    responsible_people_defined: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    change_related_events: policy(
      ["evidence", "impact"],
      { adverseWhen: "yes" },
    ),
  },

  task_accumulation: {
    accumulation_frequent: policy(
      ["frequency", "exposure"],
      { adverseWhen: "yes" },
    ),
    staff_shortage: policy(
      ["control"],
      { adverseWhen: "yes" },
    ),
    task_division_failure: policy(
      ["control"],
      { adverseWhen: "yes" },
    ),
    competing_urgent_tasks: policy(
      ["exposure"],
      { adverseWhen: "yes" },
    ),
    frequent_overtime: policy(
      ["frequency", "impact"],
      { adverseWhen: "yes" },
    ),
    constant_interruptions: policy(
      ["frequency", "impact"],
      { adverseWhen: "yes" },
    ),
    breaks_impaired: policy(
      ["control"],
      { adverseWhen: "yes" },
    ),
    quality_or_rework: policy(
      ["impact"],
      { adverseWhen: "yes" },
    ),
    team_complaints: policy(
      ["evidence", "impact"],
      { adverseWhen: "yes" },
    ),
    related_leave_conflict: policy(
      ["evidence", "impact"],
      { adverseWhen: "yes" },
    ),
  },

  frequent_conflicts: {
    conflict_frequency: policy(
      ["context", "frequency"],
      { contextualOnly: true },
    ),
    same_people_or_sectors: policy(
      ["frequency"],
      { adverseWhen: "yes" },
    ),
    routine_impact: policy(
      ["impact"],
      { adverseWhen: "yes" },
    ),
    verbal_aggression: policy(
      ["impact", "critical"],
      {
        adverseWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
    threat: policy(
      ["critical"],
      {
        adverseWhen: "yes",
        criticalWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
    humiliation: policy(
      ["impact", "critical"],
      {
        adverseWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
    report_channel: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    investigation_procedure: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    leadership_action: policy(
      ["control"],
      { adverseWhen: "no" },
    ),
    conflict_records: policy(
      ["evidence", "impact"],
      { adverseWhen: "yes" },
    ),
  },

  harassment_or_violence: {
    harassment_violence_threat_humiliation: policy(
      ["critical", "impact"],
      {
        adverseWhen: "yes",
        criticalWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
    still_happening: policy(
      ["critical", "frequency"],
      {
        adverseWhen: "yes",
        criticalWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
    immediate_risk: policy(
      ["critical"],
      {
        adverseWhen: "yes",
        criticalWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
    internal_report_channel: policy(
      ["control"],
      {
        adverseWhen: "no",
        technicalValidationWhen: "no",
      },
    ),
    referred_to_responsible: policy(
      ["control"],
      {
        adverseWhen: "no",
        technicalValidationWhen: "no",
      },
    ),
    confidentiality_needed: policy(
      ["context"],
      {
        adverseWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
    formal_evidence: policy(
      ["evidence"],
      {
        adverseWhen: "no",
        technicalValidationWhen: "no",
      },
    ),
    immediate_protection_needed: policy(
      ["critical"],
      {
        adverseWhen: "yes",
        criticalWhen: "yes",
        technicalValidationWhen: "yes",
      },
    ),
  },
}
