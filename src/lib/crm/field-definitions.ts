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

// ============================================================================
// Backward-compatible static exports (English defaults)
// ============================================================================

const id = (key: string) => key.split(".").pop() || key;

export const contactFields = getContactFields(id);
export const companyFields = getCompanyFields(id);
export const dealFields = getDealFields(id);
