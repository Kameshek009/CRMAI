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
  | "contact_created" | "task_completed" | "import";

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
  type: "contact" | "company" | "deal";
  id: string;
  title: string;
  subtitle: string;
  score?: number;
}
