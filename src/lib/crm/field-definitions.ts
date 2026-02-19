import type { FormField } from "@/components/crm/entity-form";

// ============================================================================
// Custom Field Definition (from field_definitions table)
// ============================================================================

export interface CustomFieldDefinition {
  id: string;
  team_id: string;
  entity_type: string;
  field_key: string;
  label: string;
  field_type: string;
  options: { value: string; label: string; color?: string }[] | null;
  is_required: boolean;
  position: number;
}

const FIELD_TYPE_MAP: Record<string, FormField["type"]> = {
  text: "text",
  number: "number",
  date: "date",
  select: "select",
  multi_select: "select",
  url: "url",
  email: "email",
  phone: "tel",
  boolean: "boolean",
  currency: "number",
  percent: "number",
  textarea: "textarea",
};

export function customFieldToFormField(def: CustomFieldDefinition): FormField {
  return {
    name: `metadata.${def.field_key}`,
    label: def.label,
    type: FIELD_TYPE_MAP[def.field_type] || "text",
    required: def.is_required,
    options: def.options?.map((o) => ({ label: o.label, value: o.value })),
    placeholder: def.field_type === "currency" ? "0.00" : def.field_type === "percent" ? "0-100" : undefined,
  };
}

export function mergeFieldsWithCustom(
  builtIn: FormField[],
  customDefs: CustomFieldDefinition[]
): FormField[] {
  return [...builtIn, ...customDefs.map(customFieldToFormField)];
}

// ============================================================================
// Translation helper type
// ============================================================================

type T = (key: string, params?: Record<string, string | number>) => string;

// ============================================================================
// Built-in field definitions (localized)
// ============================================================================

export function getContactFields(t: T): FormField[] {
  return [
    { name: "first_name", label: t("crm.contacts.fields.firstName"), type: "text", required: true, placeholder: "John" },
    { name: "last_name", label: t("crm.contacts.fields.lastName"), type: "text", placeholder: "Doe" },
    { name: "email", label: t("crm.contacts.fields.email"), type: "email", placeholder: "john@example.com" },
    { name: "phone", label: t("crm.contacts.fields.phone"), type: "tel", placeholder: "+1 (555) 123-4567" },
    { name: "title", label: t("crm.contacts.fields.jobTitle"), type: "text" },
    {
      name: "status", label: t("crm.contacts.fields.status"), type: "select",
      options: [
        { label: t("crm.contacts.statuses.lead"), value: "lead" },
        { label: t("crm.contacts.statuses.active"), value: "active" },
        { label: t("crm.contacts.statuses.inactive"), value: "inactive" },
      ],
    },
  ];
}

export function getCompanyFields(t: T): FormField[] {
  return [
    { name: "name", label: t("crm.companies.fields.companyName"), type: "text", required: true, placeholder: "Acme Inc" },
    { name: "domain", label: t("crm.companies.fields.domain"), type: "text", placeholder: "acme.com" },
    { name: "industry", label: t("crm.companies.fields.industry"), type: "text" },
    {
      name: "size", label: t("crm.companies.fields.size"), type: "select",
      options: [
        { label: "1-10", value: "1-10" },
        { label: "11-50", value: "11-50" },
        { label: "51-200", value: "51-200" },
        { label: "201-500", value: "201-500" },
        { label: "500+", value: "500+" },
      ],
    },
    { name: "website", label: t("crm.companies.fields.website"), type: "text", placeholder: "https://acme.com" },
    { name: "phone", label: t("crm.companies.fields.phone"), type: "tel", placeholder: "+1 (555) 123-4567" },
  ];
}

export function getDealFields(t: T): FormField[] {
  return [
    { name: "title", label: t("crm.deals.fields.dealTitle"), type: "text", required: true },
    { name: "value", label: t("crm.deals.fields.value"), type: "number", placeholder: "10000" },
    { name: "expected_close_date", label: t("crm.deals.fields.expectedClose"), type: "date" },
    { name: "description", label: t("crm.deals.fields.description"), type: "textarea" },
    {
      name: "status", label: t("crm.deals.fields.status"), type: "select",
      options: [
        { label: t("crm.deals.statuses.open"), value: "open" },
        { label: t("crm.deals.statuses.won"), value: "won" },
        { label: t("crm.deals.statuses.lost"), value: "lost" },
      ],
    },
  ];
}

export function getLeadFields(t: T): FormField[] {
  return [
    { name: "first_name", label: t("crm.leads.fields.firstName"), type: "text", required: true, placeholder: "John" },
    { name: "last_name", label: t("crm.leads.fields.lastName"), type: "text", placeholder: "Doe" },
    { name: "email", label: t("crm.leads.fields.email"), type: "email", placeholder: "john@example.com" },
    { name: "phone", label: t("crm.leads.fields.phone"), type: "tel", placeholder: "+1 (555) 123-4567" },
    { name: "mobile", label: t("crm.leads.fields.mobile"), type: "tel" },
    { name: "organization", label: t("crm.leads.fields.organization"), type: "text", placeholder: "Acme Inc" },
    { name: "website", label: t("crm.leads.fields.website"), type: "text", placeholder: "https://acme.com" },
    { name: "job_title", label: t("crm.leads.fields.jobTitle"), type: "text" },
    {
      name: "source", label: t("crm.leads.fields.source"), type: "select",
      options: [
        { label: t("crm.leads.sources.website"), value: "website" },
        { label: t("crm.leads.sources.referral"), value: "referral" },
        { label: t("crm.leads.sources.campaign"), value: "campaign" },
        { label: t("crm.leads.sources.coldCall"), value: "cold_call" },
        { label: t("crm.leads.sources.socialMedia"), value: "social_media" },
        { label: t("crm.leads.sources.event"), value: "event" },
        { label: t("crm.leads.sources.other"), value: "other" },
      ],
    },
    {
      name: "status", label: t("crm.leads.fields.status"), type: "select",
      options: [
        { label: t("crm.leads.statuses.new"), value: "new" },
        { label: t("crm.leads.statuses.contacted"), value: "contacted" },
        { label: t("crm.leads.statuses.qualified"), value: "qualified" },
        { label: t("crm.leads.statuses.unqualified"), value: "unqualified" },
        { label: t("crm.leads.statuses.junk"), value: "junk" },
      ],
    },
  ];
}

export function getCallLogFields(t: T): FormField[] {
  return [
    {
      name: "direction", label: t("crm.callLogs.fields.direction"), type: "select",
      options: [
        { label: t("crm.callLogs.directions.outbound"), value: "outbound" },
        { label: t("crm.callLogs.directions.inbound"), value: "inbound" },
      ],
    },
    {
      name: "status", label: t("crm.callLogs.fields.status"), type: "select",
      options: [
        { label: t("crm.callLogs.statuses.completed"), value: "completed" },
        { label: t("crm.callLogs.statuses.missed"), value: "missed" },
        { label: t("crm.callLogs.statuses.noAnswer"), value: "no_answer" },
        { label: t("crm.callLogs.statuses.busy"), value: "busy" },
        { label: t("crm.callLogs.statuses.voicemail"), value: "voicemail" },
        { label: t("crm.callLogs.statuses.cancelled"), value: "cancelled" },
      ],
    },
    { name: "from_number", label: t("crm.callLogs.fields.from"), type: "tel", placeholder: "+1 (555) 123-4567" },
    { name: "to_number", label: t("crm.callLogs.fields.to"), type: "tel", placeholder: "+1 (555) 987-6543" },
    { name: "duration_seconds", label: t("crm.callLogs.fields.duration"), type: "number", placeholder: "120" },
    { name: "summary", label: t("crm.callLogs.fields.summary"), type: "textarea" },
  ];
}

// ============================================================================
// Backward-compatible static exports (English defaults)
// ============================================================================

const id = (key: string) => key.split(".").pop() || key;

export const contactFields = getContactFields(id);
export const companyFields = getCompanyFields(id);
export const dealFields = getDealFields(id);
export const leadFields = getLeadFields(id);
export const callLogFields = getCallLogFields(id);
