/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

export type PasiniProposalPdfRecord = Record<string, unknown>;

type PdfProps = {
  record: PasiniProposalPdfRecord;
  logoDataUri?: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#101b3b",
    backgroundColor: "#f7f3ea",
  },
  header: {
    backgroundColor: "#101b3b",
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
  },
  logo: {
    width: 170,
    marginBottom: 14,
  },
  brandFallback: {
    color: "#ffffff",
    fontSize: 16,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    color: "#dcbe7e",
    fontSize: 10,
    lineHeight: 1.4,
  },
  notice: {
    borderColor: "#dcbe7e",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: "#fffaf0",
  },
  noticeTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#101b3b",
  },
  noticeText: {
    lineHeight: 1.45,
    color: "#2d3658",
  },
  section: {
    borderColor: "#d8ccb7",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#101b3b",
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomColor: "#e7ddc9",
    borderBottomWidth: 1,
  },
  row: {
    marginBottom: 5,
  },
  label: {
    fontSize: 7,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 1,
  },
  value: {
    fontSize: 9,
    color: "#101b3b",
    lineHeight: 1.35,
  },
  twoColumns: {
    flexDirection: "row",
  },
  column: {
    flexGrow: 1,
    flexBasis: 0,
    paddingRight: 8,
  },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopColor: "#d8ccb7",
    borderTopWidth: 1,
    fontSize: 7,
    color: "#6b7280",
    lineHeight: 1.4,
  },
});

const packageLabels: Record<string, string> = {
  essential: "Essencial",
  strategic: "Estrategico",
  premium: "Premium",
};

const vacancyStatusLabels: Record<string, string> = {
  complete: "Informacoes completas",
  partial: "Informacoes parciais",
  none: "Sem informacoes estruturadas",
};

const complexityLabels: Record<string, string> = {
  standard: "Padrao",
  strategic: "Estrategica, confidencial, lideranca ou dificil",
  unknown: "Nao sabe avaliar",
};

const paymentLabels: Record<string, string> = {
  avista: "A vista",
  "50_50": "50% na contratacao e 50% no fechamento",
  outra_condicao_negociada: "Outra condicao negociada",
};

function asText(value: unknown, fallback = "Nao informado") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "boolean") return value ? "Sim" : "Nao";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim() || fallback;
  return fallback;
}

function field(record: PasiniProposalPdfRecord, key: string, fallback = "Não informado") {
  return asText(record[key], fallback);
}

function firstField(record: PasiniProposalPdfRecord, keys: string[], fallback = "Não informado") {
  for (const key of keys) {
    const value = asText(record[key], "");

    if (value) {
      return value;
    }
  }

  return fallback;
}

function proposalStatusText(value: unknown) {
  const status = asText(value, "");

  switch (status) {
    case "pending_consultancy_review":
      return "Em análise pela consultoria";
    case "approved_for_client_acceptance":
      return "Aprovada pela consultoria para aceite do cliente";
    case "returned_with_conditions":
      return "Devolutiva emitida com novas condições";
    case "sent_to_client":
      return "Enviada ao cliente";
    case "accepted_by_client":
      return "Aceita pelo cliente";
    case "declined_by_client":
      return "Recusada pelo cliente";
    case "cancelled":
      return "Cancelada";
    default:
      return "Em análise pela consultoria";
  }
}

function consultancyDecisionText(value: unknown) {
  const decision = asText(value, "");

  switch (decision) {
    case "approved":
      return "Condições aprovadas pela consultoria";
    case "returned_with_conditions":
      return "Devolutiva com ajuste de condições comerciais";
    default:
      return "Pendente de decisão da consultoria";
  }
}

function clientAcceptanceText(value: unknown) {
  const acceptance = asText(value, "");

  switch (acceptance) {
    case "accepted":
      return "Aceita pelo proponente";
    case "declined":
      return "Recusada pelo proponente";
    case "pending":
      return "Pendente de aceite";
    default:
      return "Pendente de aceite";
  }
}

function maskedCpf(record: PasiniProposalPdfRecord, key: string) {
  const raw = field(record, key, "");
  const digits = raw.replace(/\D/g, "");

  if (digits.length < 6) return raw || "Nao informado";

  return "***." + digits.slice(3, 6) + "." + digits.slice(6, 9) + "-**";
}

function packageText(value: unknown) {
  return packageLabels[asText(value, "")] || asText(value);
}

function paymentText(value: unknown) {
  return paymentLabels[asText(value, "")] || asText(value);
}

function vacancyText(value: unknown) {
  return vacancyStatusLabels[asText(value, "")] || asText(value);
}

function complexityText(value: unknown) {
  return complexityLabels[asText(value, "")] || asText(value);
}

function Row(props: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{props.label}</Text>
      <Text style={styles.value}>{props.value}</Text>
    </View>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      {props.children}
    </View>
  );
}

export function PasiniProposalPdfDocument({ record, logoDataUri }: PdfProps) {
  const requestId = field(record, "id");
  const generatedAt = new Date().toLocaleString("pt-BR");

  return (
    <Document
      title="Proposta Comercial - Querino & Pasini Consultoria"
      author="Querino & Pasini Consultoria"
      subject="Proposta comercial de recrutamento e seleção"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logoDataUri ? (
            <Image src={logoDataUri} style={styles.logo} />
          ) : (
            <Text style={styles.brandFallback}>QUERINO & PASINI CONSULTORIA</Text>
          )}

          <Text style={styles.title}>Proposta Comercial de Recrutamento e Seleção</Text>
          <Text style={styles.subtitle}>Recrutamento e Seleção</Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Proposta comercial para análise e aceite</Text>
          <Text style={styles.noticeText}>
            Esta proposta comercial foi gerada a partir das informações enviadas pela empresa.
            O envio não formaliza a contratação. A contratação somente ocorrerá após aprovação
            das condições pela consultoria e aceite assinado digitalmente pelo proponente.
          </Text>
        </View>

        <Section title="1. Dados da empresa">
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Row label="Razão social" value={field(record, "company_legal_name")} />
              <Row label="Nome fantasia" value={field(record, "company_trade_name")} />
              <Row label="CNPJ" value={field(record, "company_cnpj")} />
            </View>
            <View style={styles.column}>
              <Row label="Endereço" value={field(record, "company_address")} />
              <Row label="Status" value={field(record, "status")} />
              <Row label="Data da solicitacao" value={field(record, "created_at")} />
            </View>
          </View>
        </Section>

        <Section title="2. Responsavel pela solicitacao">
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Row label="Nome" value={field(record, "requester_name")} />
              <Row label="Cargo" value={field(record, "requester_role_title")} />
              <Row label="CPF" value={maskedCpf(record, "requester_cpf")} />
            </View>
            <View style={styles.column}>
              <Row label="E-mail" value={field(record, "requester_email")} />
              <Row label="Telefone" value={field(record, "requester_phone")} />
              <Row label="Copia para" value={field(record, "copy_email")} />
            </View>
          </View>
        </Section>

        <Section title="3. Resumo da vaga">
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Row label="Cargo" value={field(record, "job_title")} />
              <Row label="Setor" value={field(record, "department_name")} />
              <Row label="Quantidade" value={field(record, "position_count")} />
              <Row label="Motivo" value={field(record, "hiring_reason")} />
            </View>
            <View style={styles.column}>
              <Row label="Tipo de contratacao" value={field(record, "employment_type")} />
              <Row label="Modelo de trabalho" value={field(record, "work_model")} />
              <Row label="Horario" value={field(record, "work_schedule")} />
              <Row label="Faixa salarial" value={field(record, "salary_range")} />
            </View>
          </View>
          <Row label="Beneficios" value={field(record, "benefits")} />
          <Row label="Observacoes sobre beneficios" value={field(record, "benefits_notes")} />
          <Row label="Principais atividades" value={field(record, "main_activities")} />
        </Section>

        <Section title="4. Perfil e requisitos">
          <Row label="Experiencia necessaria" value={field(record, "required_experience")} />
          <Row label="Formacao necessaria" value={field(record, "required_education")} />
          <Row label="Conhecimentos tecnicos" value={field(record, "technical_skills")} />
          <Row label="Sistemas, ferramentas ou equipamentos" value={field(record, "systems_tools_equipment")} />
          <Row label="Perfil comportamental" value={field(record, "behavioral_profile")} />
          <Row label="Criterios eliminatorios" value={field(record, "elimination_criteria")} />
          <Row label="Criterios desejaveis" value={field(record, "desirable_criteria")} />
          <Row label="Descricao formal do cargo" value={field(record, "has_job_description")} />
          <Row label="Material existente ou envio posterior" value={field(record, "job_description_attachment")} />
        </Section>

        <Section title="5. Plano e condicoes preliminares">
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Row label="Situacao das informacoes" value={vacancyText(record.vacancy_information_status)} />
              <Row label="Complexidade" value={complexityText(record.vacancy_complexity_level)} />
              <Row label="Plano sugerido" value={packageText(record.recommended_package)} />
              <Row label="Plano pretendido" value={packageText(record.selected_package)} />
            </View>
            <View style={styles.column}>
              <Row label="Forma de pagamento" value={paymentText(record.payment_terms)} />
              <Row label="Investimento comercial" value={field(record, "approved_price")} />
              <Row label="Modelo de recrutamento" value={field(record, "recruitment_model")} />
              <Row label="Status comercial" value={proposalStatusText(record.proposal_status)} />
            </View>
          </View>
          <Row label="Justificativa técnica da recomendação" value={field(record, "package_recommendation_reason")} />
          <Row label="Justificativa de alteração do plano" value={field(record, "package_override_reason")} />
          <Row label="Serviços adicionais" value={field(record, "additional_services")} />
        </Section>
        <Section title="6. Decisão comercial da consultoria">
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Row label="Status da proposta" value={proposalStatusText(record.proposal_status)} />
              <Row label="Decisão da consultoria" value={consultancyDecisionText(record.consultancy_decision)} />
            </View>
            <View style={styles.column}>
              <Row label="Status do aceite" value={clientAcceptanceText(record.client_acceptance_status)} />
              <Row label="Versão da proposta" value={field(record, "proposal_version")} />
            </View>
          </View>
          <Row
            label="Condições comerciais"
            value={firstField(record, ["commercial_conditions"], "Condições comerciais mantidas conforme investimento e forma de pagamento indicados nesta proposta.")}
          />
          <Row
            label="Devolutiva da consultoria"
            value={firstField(record, ["consultancy_feedback"], "Sem devolutiva complementar registrada.")}
          />
        </Section>

        <Section title="7. Aceite e assinatura do proponente">
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Row label="Nome do proponente" value={firstField(record, ["proponent_signature_name", "acceptance_name"])} />
              <Row label="CPF/CNPJ" value={firstField(record, ["proponent_signature_document"], maskedCpf(record, "acceptance_cpf"))} />
              <Row label="Cargo ou função" value={firstField(record, ["proponent_signature_role", "acceptance_role_title"])} />
            </View>
            <View style={styles.column}>
              <Row label="E-mail" value={firstField(record, ["proponent_signature_email", "acceptance_email"])} />
              <Row label="Data do aceite" value={firstField(record, ["proponent_signed_at", "client_accepted_at", "acceptance_date"])} />
              <Row label="Assinatura" value="________________________________________" />
            </View>
          </View>
          <Text style={styles.noticeText}>
            Ao assinar, o proponente declara ciência do escopo, das condições comerciais e da forma de pagamento desta proposta.
          </Text>
        </Section>

        <View style={styles.footer}>
          <Text>Solicitacao: {requestId}</Text>
          <Text>Gerado em: {generatedAt}</Text>
          <Text>
            Proposta Comercial de Recrutamento e Seleção emitida pela Querino & Pasini Consultoria.
            A contratação depende do aceite do proponente e da confirmação das condições comerciais.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
