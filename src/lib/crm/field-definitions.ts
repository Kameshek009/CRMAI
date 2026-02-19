import type { FormField } from "@/components/crm/entity-form";

export const contactFields: FormField[] = [
  { name: "first_name", label: "First Name", type: "text", required: true, placeholder: "John" },
  { name: "last_name", label: "Last Name", type: "text", placeholder: "Doe" },
  { name: "email", label: "Email", type: "email", placeholder: "john@example.com" },
  { name: "phone", label: "Phone", type: "tel", placeholder: "+1 (555) 123-4567" },
  { name: "title", label: "Job Title", type: "text", placeholder: "Sales Manager" },
  {
    name: "status", label: "Status", type: "select",
    options: [
      { label: "Lead", value: "lead" },
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
  },
];

export const companyFields: FormField[] = [
  { name: "name", label: "Company Name", type: "text", required: true, placeholder: "Acme Inc" },
  { name: "domain", label: "Domain", type: "text", placeholder: "acme.com" },
  { name: "industry", label: "Industry", type: "text", placeholder: "Technology" },
  {
    name: "size", label: "Company Size", type: "select",
    options: [
      { label: "1-10", value: "1-10" },
      { label: "11-50", value: "11-50" },
      { label: "51-200", value: "51-200" },
      { label: "201-500", value: "201-500" },
      { label: "500+", value: "500+" },
    ],
  },
  { name: "website", label: "Website", type: "text", placeholder: "https://acme.com" },
  { name: "phone", label: "Phone", type: "tel", placeholder: "+1 (555) 123-4567" },
];

export const dealFields: FormField[] = [
  { name: "title", label: "Deal Title", type: "text", required: true, placeholder: "Enterprise Contract" },
  { name: "value", label: "Value ($)", type: "number", placeholder: "10000" },
  { name: "expected_close_date", label: "Expected Close Date", type: "date" },
  { name: "description", label: "Description", type: "textarea", placeholder: "Deal details..." },
  {
    name: "status", label: "Status", type: "select",
    options: [
      { label: "Open", value: "open" },
      { label: "Won", value: "won" },
      { label: "Lost", value: "lost" },
    ],
  },
];

export const leadFields: FormField[] = [
  { name: "first_name", label: "First Name", type: "text", required: true, placeholder: "John" },
  { name: "last_name", label: "Last Name", type: "text", placeholder: "Doe" },
  { name: "email", label: "Email", type: "email", placeholder: "john@example.com" },
  { name: "phone", label: "Phone", type: "tel", placeholder: "+1 (555) 123-4567" },
  { name: "mobile", label: "Mobile", type: "tel", placeholder: "+1 (555) 987-6543" },
  { name: "organization", label: "Organization", type: "text", placeholder: "Acme Inc" },
  { name: "website", label: "Website", type: "text", placeholder: "https://acme.com" },
  { name: "job_title", label: "Job Title", type: "text", placeholder: "Sales Manager" },
  {
    name: "source", label: "Source", type: "select",
    options: [
      { label: "Website", value: "website" },
      { label: "Referral", value: "referral" },
      { label: "Campaign", value: "campaign" },
      { label: "Cold Call", value: "cold_call" },
      { label: "Social Media", value: "social_media" },
      { label: "Event", value: "event" },
      { label: "Other", value: "other" },
    ],
  },
  {
    name: "status", label: "Status", type: "select",
    options: [
      { label: "New", value: "new" },
      { label: "Contacted", value: "contacted" },
      { label: "Qualified", value: "qualified" },
      { label: "Unqualified", value: "unqualified" },
      { label: "Junk", value: "junk" },
    ],
  },
];

export const callLogFields: FormField[] = [
  {
    name: "direction", label: "Direction", type: "select",
    options: [
      { label: "Outbound", value: "outbound" },
      { label: "Inbound", value: "inbound" },
    ],
  },
  {
    name: "status", label: "Status", type: "select",
    options: [
      { label: "Completed", value: "completed" },
      { label: "Missed", value: "missed" },
      { label: "No Answer", value: "no_answer" },
      { label: "Busy", value: "busy" },
      { label: "Voicemail", value: "voicemail" },
      { label: "Cancelled", value: "cancelled" },
    ],
  },
  { name: "from_number", label: "From", type: "tel", placeholder: "+1 (555) 123-4567" },
  { name: "to_number", label: "To", type: "tel", placeholder: "+1 (555) 987-6543" },
  { name: "duration_seconds", label: "Duration (seconds)", type: "number", placeholder: "120" },
  { name: "summary", label: "Summary", type: "textarea", placeholder: "Call notes..." },
];
