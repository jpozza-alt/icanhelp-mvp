"use client";


import type { ReactNode } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";

type PackageKey = "essential" | "strategic" | "premium";
type VacancyInformationStatus = "complete" | "partial" | "none";
type VacancyComplexityLevel = "standard" | "strategic" | "unknown";

type DeclarationKey = "analysis_authorization";

type FormState = {
  selected_package: "" | PackageKey;
  recommended_package: PackageKey;
  package_recommendation_reason: string;
  vacancy_complexity_level: VacancyComplexityLevel;
  package_override_reason: string;
  vacancy_information_status: VacancyInformationStatus;
  company_legal_name: string;
  company_trade_name: string;
  company_cnpj: string;
  company_address: string;
  requester_name: string;
  requester_role_title: string;
  requester_cpf: string;
  requester_email: string;
  requester_phone: string;
  copy_email: string;
  job_title: string;
  department_name: string;
  position_count: number;
  hiring_reason: string;
  employment_type: string;
  work_model: string;
  work_schedule: string;
  salary_range: string;
  benefits: string;
  benefits_notes: string;
  main_activities: string;
  required_experience: string;
  required_education: string;
  technical_skills: string;
  systems_tools_equipment: string;
  behavioral_profile: string;
  elimination_criteria: string;
  desirable_criteria: string;
  has_job_description: boolean;
  job_description_attachment: string;
  additional_services: string;
  recruitment_model: string;
  approved_price: string;
  payment_terms: string;
  mandatory_declarations: DeclarationKey[];
  final_confirmation: boolean;
  lgpd_acceptance: boolean;
  terms_acceptance: boolean;
  acceptance_name: string;
  acceptance_cpf: string;
  acceptance_role_title: string;
  acceptance_email: string;
  acceptance_date: string;
  govbr_signature_status: string;
  signed_proposal_file: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialForm: FormState = {
  selected_package: "",
  recommended_package: "strategic",
  package_recommendation_reason: "Recomendacao inicial: informacoes parciais da vaga.",
  vacancy_complexity_level: "standard",
  package_override_reason: "",
  vacancy_information_status: "partial",
  company_legal_name: "",
  company_trade_name: "",
  company_cnpj: "",
  company_address: "",
  requester_name: "",
  requester_role_title: "",
  requester_cpf: "",
  requester_email: "",
  requester_phone: "",
  copy_email: "",
  job_title: "",
  department_name: "",
  position_count: 1,
  hiring_reason: "",
  employment_type: "",
  work_model: "",
  work_schedule: "",
  salary_range: "",
  benefits: "",
  benefits_notes: "",
  main_activities: "",
  required_experience: "",
  required_education: "",
  technical_skills: "",
  systems_tools_equipment: "",
  behavioral_profile: "",
  elimination_criteria: "",
  desirable_criteria: "",
  has_job_description: false,
  job_description_attachment: "",
  additional_services: "",
  recruitment_model: "",
  approved_price: "",
  payment_terms: "",
  mandatory_declarations: [],
  final_confirmation: false,
  lgpd_acceptance: false,
  terms_acceptance: false,
  acceptance_name: "",
  acceptance_cpf: "",
  acceptance_role_title: "",
  acceptance_email: "",
  acceptance_date: today,
  govbr_signature_status: "not_applicable",
  signed_proposal_file: "",
};

const steps = ["Diagnostico da contratacao", "Empresa", "Vaga", "Perfil", "Fechamento e gov.br"];

const packages: Array<{
  key: PackageKey;
  title: string;
  priceRule: string;
  description: string;
}> = [
  {
    key: "essential",
    title: "Essencial",
    priceRule: "100% do salario da vaga",
    description: "Conducao objetiva para vagas com perfil bem definido.",
  },
  {
    key: "strategic",
    title: "Estrategico",
    priceRule: "1,5 salario da vaga",
    description: "Apoio ampliado para perfis que exigem maior criterio de selecao.",
  },
  {
    key: "premium",
    title: "Premium",
    priceRule: "2 salarios da vaga",
    description: "Conducao consultiva para vagas sensiveis, liderancas ou funcoes-chave.",
  },
];

const paymentTermOptions = [
  {
    value: "avista",
    label: "À vista",
  },
  {
    value: "50_50",
    label: "50% na contratação e 50% no fechamento",
  },
  {
    value: "outra_condicao_negociada",
    label: "Outra condição negociada",
  },
];
const vacancyStatuses: Array<{
  key: VacancyInformationStatus;
  title: string;
  description: string;
}> = [
  {
    key: "complete",
    title: "Ja temos as informacoes da vaga",
    description: "A empresa ja possui descricao de cargo, briefing ou material organizado.",
  },
  {
    key: "partial",
    title: "Temos parte das informacoes",
    description: "A empresa tem dados iniciais, mas ainda precisa complementar alguns pontos.",
  },
  {
    key: "none",
    title: "Precisamos construir do zero",
    description: "A consultoria precisara apoiar a estruturacao inicial do perfil da vaga.",
  },
];

const complexityOptions: Array<{
  key: VacancyComplexityLevel;
  title: string;
  description: string;
}> = [
  {
    key: "standard",
    title: "Nao",
    description: "Vaga comum, sem indicios de confidencialidade, lideranca ou alta dificuldade.",
  },
  {
    key: "strategic",
    title: "Sim",
    description: "Vaga estrategica, de lideranca, confidencial, sensivel ou dificil de preencher.",
  },
  {
    key: "unknown",
    title: "Nao sei avaliar",
    description: "A empresa prefere que a consultoria avalie a complexidade no fechamento.",
  },
];

function getPackageRecommendation(
  vacancyStatus: VacancyInformationStatus,
  complexity: VacancyComplexityLevel,
): {
  packageKey: PackageKey;
  reason: string;
} {
  if (complexity === "strategic") {
    return {
      packageKey: "premium",
      reason: "A vaga foi marcada como estrategica, confidencial, de lideranca, sensivel ou dificil de preencher.",
    };
  }

  if (complexity === "unknown") {
    return {
      packageKey: "strategic",
      reason: "A complexidade da vaga ainda nao esta clara. O plano Estrategico e o ponto intermediario recomendado.",
    };
  }

  if (vacancyStatus === "complete") {
    return {
      packageKey: "essential",
      reason: "A empresa informou que ja possui descricao, briefing ou material organizado da vaga.",
    };
  }

  if (vacancyStatus === "none") {
    return {
      packageKey: "premium",
      reason: "A empresa informou que precisa construir o perfil da vaga do zero.",
    };
  }

  return {
    packageKey: "strategic",
    reason: "A empresa informou que possui parte das informacoes, mas precisa complementar o briefing.",
  };
}

function packageLabel(packageKey: "" | PackageKey) {
  if (packageKey === "essential") return "Essencial";
  if (packageKey === "strategic") return "Estrategico";
  if (packageKey === "premium") return "Premium";
  return "nao selecionado";
}
const declarations: Array<{
  key: DeclarationKey;
  label: string;
}> = [
  {
    key: "analysis_authorization",
    label:
      "Declaro que as informacoes fornecidas sao verdadeiras e autorizo a analise da solicitacao para elaboracao da Proposta ou Ordem de Servico. Estou ciente de que este envio nao formaliza automaticamente a contratacao, que somente ocorrera apos assinatura digital via gov.br.",
  },
];
export default function PasiniRecruitmentWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const target = event.target;
    const name = target.name as keyof FormState;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target instanceof HTMLInputElement && target.type === "number"
          ? Number(target.value)
          : target.value;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function selectPackage(selectedPackage: PackageKey) {
    setMessage("");
    setStatus("idle");
    setForm((current) => ({
      ...current,
      selected_package: selectedPackage,
    }));
  }

  function updateRecommendation(
    vacancyStatus: VacancyInformationStatus,
    complexity: VacancyComplexityLevel,
  ) {
    const recommendation = getPackageRecommendation(vacancyStatus, complexity);

    setForm((current) => ({
      ...current,
      vacancy_information_status: vacancyStatus,
      vacancy_complexity_level: complexity,
      recommended_package: recommendation.packageKey,
      package_recommendation_reason: recommendation.reason,
      selected_package:
        current.selected_package && current.selected_package !== current.recommended_package
          ? current.selected_package
          : recommendation.packageKey,
      has_job_description: vacancyStatus === "complete" ? true : current.has_job_description,
    }));
  }

  function selectVacancyStatus(vacancyStatus: VacancyInformationStatus) {
    updateRecommendation(vacancyStatus, form.vacancy_complexity_level);
  }

  function selectComplexity(complexity: VacancyComplexityLevel) {
    updateRecommendation(form.vacancy_information_status, complexity);
  }

  function toggleDeclaration(key: DeclarationKey, checked: boolean) {
    setForm((current) => {
      const nextDeclarations = checked ? [key] : [];

      return {
        ...current,
        mandatory_declarations: nextDeclarations,
        final_confirmation: checked,
        lgpd_acceptance: checked,
        terms_acceptance: checked,
      };
    });
  }

  function nextStep() {
    if (step === 0 && !form.recommended_package) {
      setStatus("error");
      setMessage("Responda as perguntas iniciais para gerar uma sugestao de plano.");
      return;
    }

    setStatus("idle");
    setMessage("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    setStatus("idle");
    setMessage("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/pasini/recruitment-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          package_recommendation_reason: form.package_recommendation_reason,
          package_override_reason:
            form.selected_package && form.selected_package !== form.recommended_package
              ? form.package_override_reason
              : "",
          govbr_signature_status: "not_applicable",
          signed_proposal_file: "",
        }),
      });

      const result = await response.json();

      if (!form.selected_package) {
        throw new Error("Escolha o plano final de contratacao antes de enviar.");
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Nao foi possivel enviar a solicitacao.");
      }

      setStatus("success");
      setMessage("Pedido enviado com sucesso. Uma minuta de proposta sera preparada para analise da consultoria. Apos aprovacao interna, a proposta podera ser enviada por WhatsApp para assinatura via gov.br.");
      setForm(initialForm);
      setStep(0);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado ao enviar a solicitacao.");
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="h-fit border-t border-[#dcbe7e]/50 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#dcbe7e]">
          Etapas
        </p>

        <div className="mt-5 h-[2px] overflow-hidden rounded-full bg-white/10">
          <div className="h-[2px] rounded-full bg-[#dcbe7e]" style={{ width: `${progress}%` }} />
        </div>

        <p className="mt-3 text-xs text-white/48">{progress}% preenchido</p>

        <nav className="mt-7 space-y-2">
          {steps.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => setStep(index)}
              className={`w-full rounded-full px-4 py-3 text-left text-sm transition ${
                index === step
                  ? "bg-[#dcbe7e] text-[#101b3b]"
                  : "border border-white/10 bg-transparent text-white/72 hover:border-[#dcbe7e]/45 hover:text-white"
              }`}
            >
              {index + 1}. {item}
            </button>
          ))}
        </nav>

        <div className="mt-8 border-t border-white/10 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
            Gov.br
          </p>
          <p className="mt-2 text-xs leading-6 text-white/55">
            A proposta sera preparada para assinatura digital apos o envio.
          </p>
        </div>
      </aside>

      <form onSubmit={handleSubmit} className="border-t border-white/10 pt-5">
        <div className="mb-8 flex items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
              Etapa {step + 1} de {steps.length}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">{steps[step]}</h2>
          </div>
        </div>

        {step === 0 && (
          <div className="grid gap-7">
            <div>
              <p className="text-sm font-semibold text-white/86">
                A empresa ja possui informacoes da vaga?
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {vacancyStatuses.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => selectVacancyStatus(item.key)}
                    className={`rounded-2xl border p-5 text-left transition ${
                      form.vacancy_information_status === item.key
                        ? "border-[#dcbe7e] bg-white/[0.10] text-white"
                        : "border-white/10 bg-white/[0.04] text-white/72 hover:border-[#dcbe7e]/60"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="mt-3 block text-xs leading-6 opacity-75">{item.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white/86">
                Essa vaga e estrategica, de lideranca, confidencial ou dificil de preencher?
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {complexityOptions.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => selectComplexity(item.key)}
                    className={`rounded-2xl border p-5 text-left transition ${
                      form.vacancy_complexity_level === item.key
                        ? "border-[#dcbe7e] bg-white/[0.10] text-white"
                        : "border-white/10 bg-white/[0.04] text-white/72 hover:border-[#dcbe7e]/60"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="mt-3 block text-xs leading-6 opacity-75">{item.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#dcbe7e]/45 bg-[#dcbe7e]/10 p-5 text-sm leading-7 text-white/84">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#dcbe7e]">
                Plano sugerido agora
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {packageLabel(form.recommended_package)}
              </p>
              <p className="mt-3 text-white/70">{form.package_recommendation_reason}</p>
              <p className="mt-4 text-xs leading-6 text-white/50">
                Esta e apenas uma sugestao. O plano final sera confirmado no fechamento, antes da proposta ou ordem de servico para assinatura gov.br.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Razao social" name="company_legal_name" value={form.company_legal_name} onChange={handleChange} />
            <Field label="Nome fantasia" name="company_trade_name" value={form.company_trade_name} onChange={handleChange} />
            <Field label="CNPJ" name="company_cnpj" value={form.company_cnpj} onChange={handleChange} />
            <Field label="Endereco completo" name="company_address" value={form.company_address} onChange={handleChange} />
            <Field required label="Nome do solicitante" name="requester_name" value={form.requester_name} onChange={handleChange} />
            <Field label="Cargo do solicitante" name="requester_role_title" value={form.requester_role_title} onChange={handleChange} />
            <Field label="CPF do solicitante" name="requester_cpf" value={form.requester_cpf} onChange={handleChange} />
            <Field required type="email" label="E-mail do solicitante" name="requester_email" value={form.requester_email} onChange={handleChange} />
            <Field label="Telefone / WhatsApp" name="requester_phone" value={form.requester_phone} onChange={handleChange} />
            <Field type="email" label="E-mail para recebimento de copia" name="copy_email" value={form.copy_email} onChange={handleChange} />
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            <div className="rounded-3xl border border-[#dcbe7e]/25 bg-[#dcbe7e]/10 p-4 text-sm leading-6 text-white/75">
              Dados basicos da vaga. Abra cada bloco e complete somente o que souber.
            </div>

            <ExpandableSection title="Identificacao da vaga" description="Cargo, setor e quantidade de vagas." defaultOpen>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Cargo ou funcao" name="job_title" value={form.job_title} onChange={handleChange} />
                <Field label="Setor ou departamento" name="department_name" value={form.department_name} onChange={handleChange} />
              </div>
              <Field label="Quantidade de vagas" name="position_count" value={String(form.position_count)} onChange={handleChange} />
            </ExpandableSection>

            <ExpandableSection title="Contratacao e formato de trabalho" description="Motivo, tipo de contrato, modelo e jornada.">
              <SelectField
                label="Motivo da contratacao"
                name="hiring_reason"
                value={form.hiring_reason}
                onChange={handleChange}
                options={[
                  { value: "substituicao", label: "Substituicao de colaborador" },
                  { value: "aumento_demanda", label: "Aumento de demanda" },
                  { value: "nova_area", label: "Nova area ou nova funcao" },
                  { value: "banco_talentos", label: "Banco de talentos" },
                  { value: "temporaria", label: "Demanda temporaria" },
                  { value: "outro", label: "Outro motivo" },
                ]}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Tipo de contrato"
                  name="employment_type"
                  value={form.employment_type}
                  onChange={handleChange}
                  options={[
                    { value: "CLT", label: "CLT" },
                    { value: "PJ", label: "PJ" },
                    { value: "temporario", label: "Temporario" },
                    { value: "estagio", label: "Estagio" },
                    { value: "aprendiz", label: "Aprendiz" },
                    { value: "outro", label: "Outro" },
                  ]}
                />
                <SelectField
                  label="Modelo de trabalho"
                  name="work_model"
                  value={form.work_model}
                  onChange={handleChange}
                  options={[
                    { value: "Presencial", label: "Presencial" },
                    { value: "Hibrido", label: "Hibrido" },
                    { value: "Remoto", label: "Remoto" },
                    { value: "Externo", label: "Externo" },
                    { value: "A definir", label: "A definir" },
                  ]}
                />
              </div>
              <SelectField
                label="Jornada"
                name="work_schedule"
                value={form.work_schedule}
                onChange={handleChange}
                options={[
                  { value: "Comercial", label: "Horario comercial" },
                  { value: "Escala", label: "Escala" },
                  { value: "Turnos", label: "Turnos" },
                  { value: "Meio periodo", label: "Meio periodo" },
                  { value: "A definir", label: "A definir" },
                ]}
              />
            </ExpandableSection>

            <ExpandableSection title="Remuneracao e beneficios" description="Faixa salarial, beneficios e observacoes.">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Faixa salarial"
                  name="salary_range"
                  value={form.salary_range}
                  onChange={handleChange}
                  options={[
                    { value: "A combinar", label: "A combinar" },
                    { value: "A definir", label: "A definir" },
                    { value: "Ate 2000", label: "Ate R$ 2.000" },
                    { value: "2000 a 3000", label: "R$ 2.000 a R$ 3.000" },
                    { value: "3000 a 5000", label: "R$ 3.000 a R$ 5.000" },
                    { value: "Acima de 5000", label: "Acima de R$ 5.000" },
                  ]}
                />
                <SelectField
                  label="Beneficios"
                  name="benefits"
                  value={form.benefits}
                  onChange={handleChange}
                  options={[
                    { value: "A definir", label: "A definir" },
                    { value: "Vale alimentacao e vale transporte", label: "Vale alimentacao e vale transporte" },
                    { value: "Beneficios internos da empresa", label: "Beneficios internos da empresa" },
                    { value: "Sem beneficios informados", label: "Sem beneficios informados" },
                    { value: "Outro", label: "Outro" },
                  ]}
                />
              </div>
              <TextArea label="Observacoes sobre beneficios ou condicoes da vaga" name="benefits_notes" value={form.benefits_notes} onChange={handleChange} />
            </ExpandableSection>

            <ExpandableSection title="Atividades principais" description="O que a pessoa fara no dia a dia.">
              <TextArea label="Atividades principais da vaga" name="main_activities" value={form.main_activities} onChange={handleChange} />
            </ExpandableSection>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            <div className="rounded-3xl border border-[#dcbe7e]/25 bg-[#dcbe7e]/10 p-4 text-sm leading-6 text-white/75">
              Preencha somente o que souber. Os blocos abaixo organizam o perfil da vaga sem deixar a tela pesada.
            </div>

            <ExpandableSection title="Experiencia necessaria" description="Informe o tipo de vivencia profissional esperada para a vaga." defaultOpen>
              <TextArea label="Experiencia necessaria" name="required_experience" value={form.required_experience} onChange={handleChange} />
            </ExpandableSection>

            <ExpandableSection title="Formacao e conhecimentos tecnicos" description="Registre escolaridade, cursos, conhecimentos e requisitos tecnicos.">
              <TextArea label="Formacao necessaria" name="required_education" value={form.required_education} onChange={handleChange} />
              <TextArea label="Conhecimentos tecnicos desejados" name="technical_skills" value={form.technical_skills} onChange={handleChange} />
            </ExpandableSection>

            <ExpandableSection title="Ferramentas, sistemas e equipamentos" description="Liste sistemas, maquinas, ferramentas ou equipamentos que a pessoa precisa usar.">
              <TextArea label="Sistemas, ferramentas ou equipamentos necessarios" name="systems_tools_equipment" value={form.systems_tools_equipment} onChange={handleChange} />
            </ExpandableSection>

            <ExpandableSection title="Perfil comportamental" description="Descreva atitudes, postura, comunicacao e caracteristicas importantes.">
              <TextArea label="Caracteristicas comportamentais esperadas" name="behavioral_profile" value={form.behavioral_profile} onChange={handleChange} />
            </ExpandableSection>

            <ExpandableSection title="Criterios de selecao" description="Separe o que elimina candidatos do que apenas ajuda na escolha.">
              <TextArea label="Criterios eliminatorios" name="elimination_criteria" value={form.elimination_criteria} onChange={handleChange} />
              <TextArea label="Criterios desejaveis" name="desirable_criteria" value={form.desirable_criteria} onChange={handleChange} />
            </ExpandableSection>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-white/86">Plano pretendido para analise</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {packages.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => selectPackage(item.key)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      form.selected_package === item.key
                        ? "border-[#dcbe7e] bg-[#dcbe7e] text-[#101b3b]"
                        : "border-white/10 bg-white/[0.04] text-white/76 hover:border-[#dcbe7e]/60"
                    }`}
                  >
                    <span className="block text-base font-semibold">{item.title}</span>
                    <span className="mt-2 block text-sm font-semibold">{item.priceRule}</span>
                    <span className="mt-3 block text-xs leading-6 opacity-80">{item.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {form.selected_package && form.selected_package !== form.recommended_package && (
              <TextArea
                label="Motivo para escolher plano diferente do sugerido"
                name="package_override_reason"
                value={form.package_override_reason}
                onChange={handleChange}
              />
            )}

            <TextArea label="Servicos adicionais desejados" name="additional_services" value={form.additional_services} onChange={handleChange} />
            <Field label="Modelo de recrutamento" name="recruitment_model" value={form.recruitment_model} onChange={handleChange} />
            <Field label="Valor estimado ou referencia comercial" name="approved_price" value={form.approved_price} onChange={handleChange} />
                        <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
              Forma de pagamento
              <select
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#dcbe7e]/70 focus:bg-white/[0.06]"
                name="payment_terms"
                value={form.payment_terms}
                onChange={handleChange}
                required
              >
                <option value="" className="text-[#101b3b]">
                  Selecione uma opcao
                </option>
                {paymentTermOptions.map((option) => (
                  <option key={option.value} value={option.value} className="text-[#101b3b]">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl border border-[#dcbe7e]/35 bg-[#dcbe7e]/10 p-4 text-sm leading-7 text-white/82 md:col-span-2">
              Plano sugerido:{" "}
              <span className="font-semibold text-[#dcbe7e]">
                {packageLabel(form.recommended_package)}
              </span>
              . Plano pretendido:{" "}
              <span className="font-semibold text-[#dcbe7e]">
                {packageLabel(form.selected_package)}
              </span>
              . Este envio gera pedido de analise. A contratacao somente sera formalizada apos Proposta ou Ordem de Servico assinada via gov.br.
            </div>

            <Field required label="Nome completo do responsavel autorizador" name="acceptance_name" value={form.acceptance_name} onChange={handleChange} />
            <Field label="CPF do responsavel autorizador" name="acceptance_cpf" value={form.acceptance_cpf} onChange={handleChange} />
            <Field label="Cargo do responsavel autorizador" name="acceptance_role_title" value={form.acceptance_role_title} onChange={handleChange} />
            <Field required type="email" label="E-mail do responsavel autorizador" name="acceptance_email" value={form.acceptance_email} onChange={handleChange} />
            <Field required type="date" label="Data da solicitacao" name="acceptance_date" value={form.acceptance_date} onChange={handleChange} />

            <input type="hidden" name="govbr_signature_status" value={form.govbr_signature_status} />
            <input type="hidden" name="signed_proposal_file" value={form.signed_proposal_file} />

            {declarations.map((item) => (
              <label
                key={item.key}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-white/78 md:col-span-2"
              >
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={form.mandatory_declarations.includes(item.key)}
                  onChange={(event) => toggleDeclaration(item.key, event.target.checked)}
                  required
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        )}
        {message && (
          <div
            className={`mt-6 rounded-2xl p-4 text-sm ${
              status === "success"
                ? "bg-[#dcbe7e] text-[#101b3b]"
                : "border border-[#AF3800]/45 bg-[#AF3800]/16 text-white"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 0 || status === "submitting"}
            className="rounded-full border border-white/14 bg-transparent px-5 py-3 text-sm font-semibold text-white/82 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Voltar
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="rounded-full bg-[#dcbe7e] px-5 py-3 text-sm font-semibold text-[#101b3b] transition hover:bg-[#F2F2F2]"
            >
              Continuar
            </button>
          ) : (
            <button
              type="submit"
              disabled={status === "submitting"}
              className="rounded-full bg-[#dcbe7e] px-5 py-3 text-sm font-semibold text-[#101b3b] transition hover:bg-[#F2F2F2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "submitting" ? "Enviando..." : "Enviar solicitacao"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}


function ExpandableSection({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-3xl border border-white/10 bg-white/[0.04] p-4 open:bg-white/[0.06]"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
        <span>
          <span className="block text-sm font-semibold text-white">{title}</span>
          {description ? (
            <span className="mt-1 block text-xs leading-5 text-white/50">{description}</span>
          ) : null}
        </span>
        <span className="rounded-full border border-[#dcbe7e]/40 px-3 py-1 text-xs font-semibold text-[#dcbe7e]">
          abrir
        </span>
      </summary>
      <div className="mt-4 grid gap-4">{children}</div>
    </details>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
      {label}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#dcbe7e]/70 focus:bg-white/[0.06]"
      >
        <option value="" className="text-[#101b3b]">
          Selecione uma opcao
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-[#101b3b]">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Field(props: {
  label: string;
  name: keyof FormState;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
      {props.label}
      <input
        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#dcbe7e]/70 focus:bg-white/[0.06]"
        type={props.type || "text"}
        name={props.name}
        value={props.value}
        onChange={props.onChange}
        required={props.required}
      />
    </label>
  );
}

function TextArea(props: {
  label: string;
  name: keyof FormState;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-white/80 md:col-span-2">
      {props.label}
      <textarea
        className="min-h-28 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#dcbe7e]/70 focus:bg-white/[0.06]"
        name={props.name}
        value={props.value}
        onChange={props.onChange}
      />
    </label>
  );
}










