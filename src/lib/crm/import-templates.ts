// Preset column-to-field maps for the most common CRM exports.
//
// Headers are matched case-insensitively after trimming, so "First Name" and
// "first name" / "FIRST NAME" all land on the same Nexxus field. If a source
// uses several aliases for the same column (e.g. HubSpot can export "Phone"
// or "Phone Number"), list each alias — the importer takes the first match.
//
// Coverage choices: we ship presets for Contacts and Leads, the two entities
// realtors actually migrate. Companies/Deals are out of scope for this MVP
// (requires stage mapping which is too source-specific) and tracked in the
// roadmap.

export type ImportEntity = "contacts" | "leads";

export type NexxusContactField =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "title"
  | "company"
  | "source";

export type NexxusLeadField =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "mobile"
  | "organization"
  | "job_title"
  | "source"
  | "status"
  | "notes";

export type ImportTemplate = {
  id: "hubspot" | "salesforce" | "bitrix24" | "amocrm" | "generic";
  name: string;
  description: string;
  // Maps source column header (case-insensitive) → Nexxus field. Multiple
  // aliases may point at the same field; the importer resolves them by
  // matching the first header in the CSV that maps to a given field.
  contacts: Record<string, NexxusContactField>;
  leads: Record<string, NexxusLeadField>;
};

const HUBSPOT: ImportTemplate = {
  id: "hubspot",
  name: "HubSpot",
  description: "Use the default HubSpot Contacts/Leads export.",
  contacts: {
    "First Name": "first_name",
    "Last Name": "last_name",
    "Email": "email",
    "Phone Number": "phone",
    "Phone": "phone",
    "Job Title": "title",
    "Company name": "company",
    "Company Name": "company",
    "Lead Source": "source",
  },
  leads: {
    "First Name": "first_name",
    "Last Name": "last_name",
    "Email": "email",
    "Phone Number": "phone",
    "Mobile Phone Number": "mobile",
    "Company": "organization",
    "Company name": "organization",
    "Job Title": "job_title",
    "Lead Source": "source",
    "Lead Status": "status",
    "Notes": "notes",
  },
};

const SALESFORCE: ImportTemplate = {
  id: "salesforce",
  name: "Salesforce",
  description: "Default Contacts / Leads export from Salesforce Data Loader.",
  contacts: {
    "FirstName": "first_name",
    "First Name": "first_name",
    "LastName": "last_name",
    "Last Name": "last_name",
    "Email": "email",
    "Phone": "phone",
    "Title": "title",
    "Account Name": "company",
    "AccountName": "company",
    "LeadSource": "source",
    "Lead Source": "source",
  },
  leads: {
    "FirstName": "first_name",
    "First Name": "first_name",
    "LastName": "last_name",
    "Last Name": "last_name",
    "Email": "email",
    "Phone": "phone",
    "MobilePhone": "mobile",
    "Mobile Phone": "mobile",
    "Company": "organization",
    "Title": "job_title",
    "LeadSource": "source",
    "Lead Source": "source",
    "Status": "status",
    "Description": "notes",
  },
};

const BITRIX24: ImportTemplate = {
  id: "bitrix24",
  name: "Bitrix24",
  description: "Default contacts/leads export from Bitrix24 (Russian or English columns).",
  contacts: {
    "Имя": "first_name",
    "NAME": "first_name",
    "Name": "first_name",
    "First Name": "first_name",
    "Фамилия": "last_name",
    "LAST_NAME": "last_name",
    "Last Name": "last_name",
    "Email": "email",
    "EMAIL": "email",
    "E-mail": "email",
    "Телефон": "phone",
    "PHONE": "phone",
    "Phone": "phone",
    "Должность": "title",
    "POST": "title",
    "Position": "title",
    "Компания": "company",
    "COMPANY_TITLE": "company",
    "Источник": "source",
    "SOURCE_ID": "source",
  },
  leads: {
    "Имя": "first_name",
    "NAME": "first_name",
    "Name": "first_name",
    "Фамилия": "last_name",
    "LAST_NAME": "last_name",
    "Email": "email",
    "EMAIL": "email",
    "Телефон": "phone",
    "PHONE": "phone",
    "Мобильный": "mobile",
    "Компания": "organization",
    "COMPANY_TITLE": "organization",
    "Должность": "job_title",
    "POST": "job_title",
    "Источник": "source",
    "SOURCE_ID": "source",
    "Статус": "status",
    "STATUS_ID": "status",
    "Комментарий": "notes",
    "COMMENTS": "notes",
  },
};

const AMOCRM: ImportTemplate = {
  id: "amocrm",
  name: "amoCRM",
  description: "Default export from amoCRM (Russian column headers).",
  contacts: {
    "Имя": "first_name",
    "Name": "first_name",
    "Фамилия": "last_name",
    "Last Name": "last_name",
    "Email": "email",
    "Телефон": "phone",
    "Phone": "phone",
    "Должность": "title",
    "Компания": "company",
    "Источник": "source",
  },
  leads: {
    "Название сделки": "first_name",
    "Название": "first_name",
    "Контакт": "first_name",
    "Email": "email",
    "Телефон": "phone",
    "Мобильный": "mobile",
    "Компания": "organization",
    "Должность": "job_title",
    "Источник": "source",
    "Статус": "status",
    "Этап": "status",
    "Примечание": "notes",
    "Комментарий": "notes",
  },
};

const GENERIC: ImportTemplate = {
  id: "generic",
  name: "Generic CSV",
  description: "Already in Nexxus field names (first_name, last_name, email, …).",
  contacts: {
    "first_name": "first_name",
    "last_name": "last_name",
    "name": "first_name",
    "email": "email",
    "phone": "phone",
    "title": "title",
    "job_title": "title",
    "company": "company",
    "company_name": "company",
    "organization": "company",
    "source": "source",
  },
  leads: {
    "first_name": "first_name",
    "last_name": "last_name",
    "name": "first_name",
    "email": "email",
    "phone": "phone",
    "mobile": "mobile",
    "organization": "organization",
    "company": "organization",
    "job_title": "job_title",
    "title": "job_title",
    "source": "source",
    "status": "status",
    "notes": "notes",
  },
};

export const IMPORT_TEMPLATES: ImportTemplate[] = [
  HUBSPOT,
  SALESFORCE,
  BITRIX24,
  AMOCRM,
  GENERIC,
];

export function getTemplate(id: string): ImportTemplate | undefined {
  return IMPORT_TEMPLATES.find((t) => t.id === id);
}

// Returns an array the same length as `headers` where each slot is the Nexxus
// field for that source column (or null if we can't auto-detect it).
export function autoMap(
  template: ImportTemplate,
  entity: ImportEntity,
  headers: string[],
): Array<string | null> {
  const map = entity === "contacts" ? template.contacts : template.leads;
  // Normalise to lower-case once so lookups are O(1).
  const normalised: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) normalised[k.toLowerCase().trim()] = v;
  return headers.map((h) => normalised[h.toLowerCase().trim()] ?? null);
}

export function contactFields(): NexxusContactField[] {
  return ["first_name", "last_name", "email", "phone", "title", "company", "source"];
}

export function leadFields(): NexxusLeadField[] {
  return ["first_name", "last_name", "email", "phone", "mobile", "organization", "job_title", "source", "status", "notes"];
}
