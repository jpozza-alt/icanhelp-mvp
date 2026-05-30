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

function field(record: PasiniProposalPdfRecord, key: string, fallback = "Nao informado") {
  return asText(record[key], fallback);
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
      title="Minuta de Proposta - Querino & Pasini Consultoria"
      author="Querino & Pasini Consultoria"
      subject="Minuta de proposta para analise interna"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logoDataUri ? (
            <Image src={logoDataUri} style={styles.logo} />
          ) : (
            <Text style={styles.brandFallback}>QUERINO & PASINI CONSULTORIA</Text>
          )}

          <Text style={styles.title}>Minuta de Proposta de Servico</Text>
          <Text style={styles.subtitle}>Recrutamento e Selecao</Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Documento para analise interna</Text>
          <Text style={styles.noticeText}>
            Esta minuta foi gerada automaticamente a partir do briefing enviado pela empresa.
            O documento nao formaliza contratacao. A contratacao somente ocorrera apos validacao
            da consultoria, emissao da Proposta ou Ordem de Servico e assinatura digital via gov.br.
          </Text>
        </View>

        <Section title="1. Dados da empresa">
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Row label="Razao social" value={field(record, "company_legal_name")} />
              <Row label="Nome fantasia" value={field(record, "company_trade_name")} />
              <Row label="CNPJ" value={field(record, "company_cnpj")} />
            </View>
            <View style={styles.column}>
              <Row label="Endereco" value={field(record, "company_address")} />
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
              <Row label="Valor/referencia comercial" value={field(record, "approved_price")} />
              <Row label="Modelo de recrutamento" value={field(record, "recruitment_model")} />
              <Row label="Status gov.br" value={field(record, "govbr_signature_status")} />
            </View>
          </View>
          <Row label="Motivo da recomendacao" value={field(record, "package_recommendation_reason")} />
          <Row label="Motivo de alteracao do plano" value={field(record, "package_override_reason")} />
          <Row label="Servicos adicionais" value={field(record, "additional_services")} />
        </Section>

        <Section title="6. Autorizador informado">
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Row label="Nome" value={field(record, "acceptance_name")} />
              <Row label="Cargo" value={field(record, "acceptance_role_title")} />
              <Row label="CPF" value={maskedCpf(record, "acceptance_cpf")} />
            </View>
            <View style={styles.column}>
              <Row label="E-mail" value={field(record, "acceptance_email")} />
              <Row label="Data informada" value={field(record, "acceptance_date")} />
              <Row label="Aceite registrado em" value={field(record, "accepted_at")} />
            </View>
          </View>
        </Section>

        <View style={styles.footer}>
          <Text>Solicitacao: {requestId}</Text>
          <Text>Gerado em: {generatedAt}</Text>
          <Text>
            Minuta destinada a analise da Querino & Pasini Consultoria. O envio por WhatsApp e a
            assinatura via gov.br devem ocorrer somente apos validacao interna.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
