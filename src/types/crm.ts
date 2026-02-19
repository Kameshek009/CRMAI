// ============================================================================
// CRM Types for Nexxus CRM
// ============================================================================

export type ContactStatus = "lead" | "active" | "inactive" | "churned";
export type DealStatus = "open" | "won" | "lost";
export type CrmTaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskType = "call" | "email" | "meeting" | "follow_up" | "other";
export type CrmActivityType =
  | "note" | "call" | "email" | "meeting"
  | "deal_created" | "deal_stage_changed" | "deal_won" | "deal_lost"
  | "contact_created" | "task_completed" | "import"
  | "lead_created" | "lead_converted" | "lead_status_changed";

// New types for Frappe CRM redesign
export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified" | "junk";
export type CallLogStatus = "completed" | "missed" | "no_answer" | "busy" | "voicemail" | "cancelled";
export type CallDirection = "inbound" | "outbound";
export type EmailStatus = "draft" | "sent" | "received" | "failed";
export type ViewMode = "table" | "kanban" | "group_by";
export type EntityType = "contacts" | "leads" | "deals" | "organizations" | "tasks" | "call_logs" | "notes";

// ============================================================================
// Company
// ============================================================================

export interface Company {
  id: string;
  accountId: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
  aiHealthScore: number;
  tags: string[];
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyRow {
  id: string;
  account_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
  ai_health_score: number;
  tags: string[];
  metadata: Record<string, unknown>;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export function transformCompanyRow(row: CompanyRow): Company {
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.name,
    domain: row.domain,
    industry: row.industry,
    size: row.size,
    phone: row.phone,
    email: row.email,
    address: row.address,
    website: row.website,
    description: row.description,
    aiHealthScore: row.ai_health_score,
    tags: row.tags || [],
    metadata: row.metadata || {},
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Contact
// ============================================================================

export interface Contact {
  id: string;
  accountId: string;
  companyId: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: ContactStatus;
  source: string | null;
  aiSentiment: string | null;
  engagementScore: number;
  lastContactedAt: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  company?: Company | null;
}

export interface ContactRow {
  id: string;
  account_id: string;
  company_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: ContactStatus;
  source: string | null;
  ai_sentiment: string | null;
  engagement_score: number;
  last_contacted_at: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  companies?: CompanyRow | null;
}

export function transformContactRow(row: ContactRow): Contact {
  return {
    id: row.id,
    accountId: row.account_id,
    companyId: row.company_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    title: row.title,
    status: row.status,
    source: row.source,
    aiSentiment: row.ai_sentiment,
    engagementScore: row.engagement_score,
    lastContactedAt: row.last_contacted_at,
    tags: row.tags || [],
    metadata: row.metadata || {},
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    company: row.companies ? transformCompanyRow(row.companies) : null,
  };
}

// ============================================================================
// Deal Stage
// ============================================================================

export interface DealStage {
  id: string;
  accountId: string;
  name: string;
  position: number;
  color: string;
  isWon: boolean;
  isLost: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DealStageRow {
  id: string;
  account_id: string;
  name: string;
  position: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

export function transformDealStageRow(row: DealStageRow): DealStage {
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.name,
    position: row.position,
    color: row.color,
    isWon: row.is_won,
    isLost: row.is_lost,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Deal
// ============================================================================

export interface Deal {
  id: string;
  accountId: string;
  stageId: string;
  contactId: string | null;
  companyId: string | null;
  title: string;
  value: number;
  currency: string;
  status: DealStatus;
  aiWinProbability: number;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  description: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  stage?: DealStage | null;
  contact?: Contact | null;
  company?: Company | null;
}

export interface DealRow {
  id: string;
  account_id: string;
  stage_id: string;
  contact_id: string | null;
  company_id: string | null;
  title: string;
  value: number;
  currency: string;
  status: DealStatus;
  ai_win_probability: number;
  expected_close_date: string | null;
  actual_close_date: string | null;
  description: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deal_stages?: DealStageRow | null;
  contacts?: ContactRow | null;
  companies?: CompanyRow | null;
}

export function transformDealRow(row: DealRow): Deal {
  return {
    id: row.id,
    accountId: row.account_id,
    stageId: row.stage_id,
    contactId: row.contact_id,
    companyId: row.company_id,
    title: row.title,
    value: Number(row.value),
    currency: row.currency,
    status: row.status,
    aiWinProbability: row.ai_win_probability,
    expectedCloseDate: row.expected_close_date,
    actualCloseDate: row.actual_close_date,
    description: row.description,
    tags: row.tags || [],
    metadata: row.metadata || {},
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stage: row.deal_stages ? transformDealStageRow(row.deal_stages) : null,
    contact: row.contacts ? transformContactRow(row.contacts) : null,
    company: row.companies ? transformCompanyRow(row.companies) : null,
  };
}

// ============================================================================
// CRM Task
// ============================================================================

export interface CrmTask {
  id: string;
  accountId: string;
  contactId: string | null;
  dealId: string | null;
  companyId: string | null;
  leadId: string | null;
  title: string;
  description: string | null;
  type: TaskType;
  priority: TaskPriority;
  status: CrmTaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  isAiGenerated: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joined
  contact?: Contact | null;
  deal?: Deal | null;
}

export interface CrmTaskRow {
  id: string;
  account_id: string;
  contact_id: string | null;
  deal_id: string | null;
  company_id: string | null;
  lead_id: string | null;
  title: string;
  description: string | null;
  type: TaskType;
  priority: TaskPriority;
  status: CrmTaskStatus;
  due_date: string | null;
  completed_at: string | null;
  is_ai_generated: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function transformCrmTaskRow(row: CrmTaskRow): CrmTask {
  return {
    id: row.id,
    accountId: row.account_id,
    contactId: row.contact_id,
    dealId: row.deal_id,
    companyId: row.company_id,
    leadId: row.lead_id,
    title: row.title,
    description: row.description,
    type: row.type,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    isAiGenerated: row.is_ai_generated,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Activity
// ============================================================================

export interface Activity {
  id: string;
  accountId: string;
  contactId: string | null;
  dealId: string | null;
  companyId: string | null;
  leadId: string | null;
  type: CrmActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityRow {
  id: string;
  account_id: string;
  contact_id: string | null;
  deal_id: string | null;
  company_id: string | null;
  lead_id: string | null;
  type: CrmActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function transformActivityRow(row: ActivityRow): Activity {
  return {
    id: row.id,
    accountId: row.account_id,
    contactId: row.contact_id,
    dealId: row.deal_id,
    companyId: row.company_id,
    leadId: row.lead_id,
    type: row.type,
    title: row.title,
    description: row.description,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

// ============================================================================
// Note
// ============================================================================

export interface Note {
  id: string;
  accountId: string;
  contactId: string | null;
  dealId: string | null;
  companyId: string | null;
  leadId: string | null;
  content: string;
  isPinned: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRow {
  id: string;
  account_id: string;
  contact_id: string | null;
  deal_id: string | null;
  company_id: string | null;
  lead_id: string | null;
  content: string;
  is_pinned: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function transformNoteRow(row: NoteRow): Note {
  return {
    id: row.id,
    accountId: row.account_id,
    contactId: row.contact_id,
    dealId: row.deal_id,
    companyId: row.company_id,
    leadId: row.lead_id,
    content: row.content,
    isPinned: row.is_pinned,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Pipeline Column (for Kanban view)
// ============================================================================

export interface PipelineColumn {
  stage: DealStage;
  deals: Deal[];
  totalValue: number;
  count: number;
}

// ============================================================================
// AI Insight
// ============================================================================

export interface AIInsight {
  id: string;
  type: "warning" | "opportunity" | "info" | "action";
  title: string;
  description: string;
  entityType?: "contact" | "deal" | "company";
  entityId?: string;
  priority: "low" | "medium" | "high";
}

// ============================================================================
// CRM Dashboard Stats
// ============================================================================

export interface CrmStats {
  totalContacts: number;
  newContactsThisWeek: number;
  totalDeals: number;
  openDeals: number;
  pipelineValue: number;
  weightedForecast: number;
  tasksDueToday: number;
  overdueTasksCount: number;
  wonDealsThisMonth: number;
  wonValueThisMonth: number;
}

// ============================================================================
// Search Result
// ============================================================================

export interface SearchResult {
  type: "contact" | "company" | "deal" | "lead";
  id: string;
  title: string;
  subtitle: string;
  score?: number;
}

// ============================================================================
// Lead
// ============================================================================

export interface Lead {
  id: string;
  teamId: string;
  accountId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  organization: string | null;
  website: string | null;
  jobTitle: string | null;
  source: string | null;
  status: LeadStatus;
  leadOwnerAccountId: string | null;
  convertedDealId: string | null;
  convertedContactId: string | null;
  convertedAt: string | null;
  notes: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadRow {
  id: string;
  team_id: string;
  account_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  organization: string | null;
  website: string | null;
  job_title: string | null;
  source: string | null;
  status: LeadStatus;
  lead_owner_account_id: string | null;
  converted_deal_id: string | null;
  converted_contact_id: string | null;
  converted_at: string | null;
  notes: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export function transformLeadRow(row: LeadRow): Lead {
  return {
    id: row.id,
    teamId: row.team_id,
    accountId: row.account_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    mobile: row.mobile,
    organization: row.organization,
    website: row.website,
    jobTitle: row.job_title,
    source: row.source,
    status: row.status,
    leadOwnerAccountId: row.lead_owner_account_id,
    convertedDealId: row.converted_deal_id,
    convertedContactId: row.converted_contact_id,
    convertedAt: row.converted_at,
    notes: row.notes,
    tags: row.tags || [],
    metadata: row.metadata || {},
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Call Log
// ============================================================================

export interface CallLog {
  id: string;
  teamId: string;
  accountId: string;
  contactId: string | null;
  leadId: string | null;
  dealId: string | null;
  callerAccountId: string | null;
  direction: CallDirection;
  status: CallLogStatus;
  durationSeconds: number;
  fromNumber: string | null;
  toNumber: string | null;
  summary: string | null;
  recordingUrl: string | null;
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined
  contact?: Contact | null;
  lead?: Lead | null;
}

export interface CallLogRow {
  id: string;
  team_id: string;
  account_id: string;
  contact_id: string | null;
  lead_id: string | null;
  deal_id: string | null;
  caller_account_id: string | null;
  direction: CallDirection;
  status: CallLogStatus;
  duration_seconds: number;
  from_number: string | null;
  to_number: string | null;
  summary: string | null;
  recording_url: string | null;
  metadata: Record<string, unknown>;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export function transformCallLogRow(row: CallLogRow): CallLog {
  return {
    id: row.id,
    teamId: row.team_id,
    accountId: row.account_id,
    contactId: row.contact_id,
    leadId: row.lead_id,
    dealId: row.deal_id,
    callerAccountId: row.caller_account_id,
    direction: row.direction,
    status: row.status,
    durationSeconds: row.duration_seconds,
    fromNumber: row.from_number,
    toNumber: row.to_number,
    summary: row.summary,
    recordingUrl: row.recording_url,
    metadata: row.metadata || {},
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Saved View
// ============================================================================

export interface SavedView {
  id: string;
  teamId: string;
  createdByAccountId: string;
  entityType: EntityType;
  label: string;
  icon: string | null;
  filters: Record<string, unknown>;
  sortBy: string | null;
  sortOrder: string;
  groupBy: string | null;
  columns: string[];
  viewMode: ViewMode;
  isPinned: boolean;
  isPublic: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedViewRow {
  id: string;
  team_id: string;
  created_by_account_id: string;
  entity_type: EntityType;
  label: string;
  icon: string | null;
  filters: Record<string, unknown>;
  sort_by: string | null;
  sort_order: string;
  group_by: string | null;
  columns: string[];
  view_mode: ViewMode;
  is_pinned: boolean;
  is_public: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export function transformSavedViewRow(row: SavedViewRow): SavedView {
  return {
    id: row.id,
    teamId: row.team_id,
    createdByAccountId: row.created_by_account_id,
    entityType: row.entity_type,
    label: row.label,
    icon: row.icon,
    filters: row.filters || {},
    sortBy: row.sort_by,
    sortOrder: row.sort_order,
    groupBy: row.group_by,
    columns: row.columns || [],
    viewMode: row.view_mode,
    isPinned: row.is_pinned,
    isPublic: row.is_public,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Email Communication
// ============================================================================

export interface EmailCommunication {
  id: string;
  teamId: string;
  accountId: string;
  contactId: string | null;
  leadId: string | null;
  dealId: string | null;
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  fromEmail: string;
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  direction: CallDirection;
  status: EmailStatus;
  messageId: string | null;
  inReplyTo: string | null;
  threadId: string | null;
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  sentAt: string | null;
  createdAt: string;
}

export interface EmailCommunicationRow {
  id: string;
  team_id: string;
  account_id: string;
  contact_id: string | null;
  lead_id: string | null;
  deal_id: string | null;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  from_email: string;
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  direction: CallDirection;
  status: EmailStatus;
  message_id: string | null;
  in_reply_to: string | null;
  thread_id: string | null;
  metadata: Record<string, unknown>;
  is_deleted: boolean;
  sent_at: string | null;
  created_at: string;
}

export function transformEmailCommunicationRow(row: EmailCommunicationRow): EmailCommunication {
  return {
    id: row.id,
    teamId: row.team_id,
    accountId: row.account_id,
    contactId: row.contact_id,
    leadId: row.lead_id,
    dealId: row.deal_id,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    fromEmail: row.from_email,
    toEmails: row.to_emails || [],
    ccEmails: row.cc_emails || [],
    bccEmails: row.bcc_emails || [],
    direction: row.direction,
    status: row.status,
    messageId: row.message_id,
    inReplyTo: row.in_reply_to,
    threadId: row.thread_id,
    metadata: row.metadata || {},
    isDeleted: row.is_deleted,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}
