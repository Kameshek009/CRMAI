"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { PageContainer } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, UserPlus, Handshake, Loader2 } from "lucide-react";
import { TimeAgo } from "@/components/ui/time-ago";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { ClickToCall } from "@/components/crm/click-to-call";
import { AttachmentGallery } from "@/components/crm/attachment-gallery";
import { toast } from "sonner";
import type { Attachment } from "@/lib/supabase/storage";

interface LeadDetail {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  organization: string | null;
  website: string | null;
  job_title: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  tags: string[];
  converted_at: string | null;
  converted_contact_id: string | null;
  converted_deal_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface DealStage {
  id: string;
  name: string;
  position: number;
}

export function LeadDetailContent({ leadId }: { leadId: string }) {
  const router = useRouter();
  const { t } = useTranslation();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<LeadDetail>>({});

  // Convert dialog
  const [showConvert, setShowConvert] = useState(false);
  const [convertContact, setConvertContact] = useState(true);
  const [convertDeal, setConvertDeal] = useState(false);
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStageId, setDealStageId] = useState("");
  const [stages, setStages] = useState<DealStage[]>([]);
  const [isConverting, setIsConverting] = useState(false);

  const hasUnsavedChanges = lead != null && JSON.stringify(editData) !== JSON.stringify(lead);
  useUnsavedChanges(hasUnsavedChanges);

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`);
      const json = await res.json();
      if (json.success) {
        setLead(json.data);
        setEditData(json.data);
        setAttachments((json.data?.metadata?.attachments as Attachment[]) || []);
      } else {
        toast.error(json.error || t("crm.leads.failedLoad"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [leadId, t]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: editData.first_name,
          last_name: editData.last_name,
          email: editData.email,
          phone: editData.phone,
          mobile: editData.mobile,
          organization: editData.organization,
          website: editData.website,
          job_title: editData.job_title,
          source: editData.source,
          status: editData.status,
          notes: editData.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.leads.saved"));
        setLead(json.data);
      } else {
        toast.error(json.error || t("common.failedSave"));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openConvertDialog = async () => {
    setShowConvert(true);
    if (lead) {
      setDealTitle(`${lead.first_name} ${lead.last_name || ""}`.trim());
    }
    // Load stages
    try {
      const res = await fetch("/api/crm/pipeline");
      const json = await res.json();
      if (json.success) {
        const stageList = json.data.columns.map((c: { stage: DealStage }) => c.stage);
        setStages(stageList);
        if (stageList.length > 0) setDealStageId(stageList[0].id);
      }
    } catch {
      toast.error(t("common.failed"));
    }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          create_contact: convertContact,
          create_deal: convertDeal,
          deal_title: dealTitle,
          deal_value: Number(dealValue) || 0,
          deal_stage_id: dealStageId || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.leads.convert.success"));
        setShowConvert(false);
        if (json.data.contact_id) {
          router.push(`/dashboard/contacts/${json.data.contact_id}`);
        } else if (json.data.deal_id) {
          router.push(`/dashboard/deals/${json.data.deal_id}`);
        } else {
          fetchLead();
        }
      } else {
        toast.error(json.error || t("crm.leads.convert.failed"));
      }
    } finally {
      setIsConverting(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!lead) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">{t("crm.leads.notFound")}</p>
      </PageContainer>
    );
  }

  const isConverted = !!lead.converted_at;

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/leads")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{lead.first_name} {lead.last_name || ""}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline">{lead.status}</Badge>
              {isConverted && (
                <Badge variant="secondary" className="text-emerald-600 bg-emerald-500/10">
                  {t("crm.leads.fields.converted")}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isConverted && (
            <Button variant="outline" onClick={openConvertDialog}>
              <UserPlus className="size-4 mr-1.5" />
              {t("crm.leads.convert.button")}
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="size-4 mr-1.5" />
            {t("common.save")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("crm.leads.details")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("crm.leads.fields.firstName")}</Label>
              <Input value={editData.first_name || ""} onChange={(e) => setEditData({ ...editData, first_name: e.target.value })} />
            </div>
            <div>
              <Label>{t("crm.leads.fields.lastName")}</Label>
              <Input value={editData.last_name || ""} onChange={(e) => setEditData({ ...editData, last_name: e.target.value })} />
            </div>
            <div>
              <Label>{t("crm.leads.fields.email")}</Label>
              <Input type="email" value={editData.email || ""} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
            </div>
            <div>
              <Label>{t("crm.leads.fields.phone")}</Label>
              <div className="flex items-center gap-1">
                <Input value={editData.phone || ""} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
                {editData.phone && (
                  <ClickToCall phoneNumber={editData.phone} leadId={leadId} contactName={`${editData.first_name || ""} ${editData.last_name || ""}`.trim()} variant="icon" size="sm" />
                )}
              </div>
            </div>
            <div>
              <Label>{t("crm.leads.fields.organization")}</Label>
              <Input value={editData.organization || ""} onChange={(e) => setEditData({ ...editData, organization: e.target.value })} />
            </div>
            <div>
              <Label>{t("crm.leads.fields.jobTitle")}</Label>
              <Input value={editData.job_title || ""} onChange={(e) => setEditData({ ...editData, job_title: e.target.value })} />
            </div>
            <div>
              <Label>{t("crm.leads.fields.website")}</Label>
              <Input value={editData.website || ""} onChange={(e) => setEditData({ ...editData, website: e.target.value })} />
            </div>
            <div>
              <Label>{t("crm.leads.fields.source")}</Label>
              <Input value={editData.source || ""} onChange={(e) => setEditData({ ...editData, source: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>{t("crm.leads.fields.notes")}</Label>
              <Textarea value={editData.notes || ""} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={4} />
            </div>
          </CardContent>
        </Card>

        {/* Status & meta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("crm.leads.fields.status")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={editData.status || "new"} onValueChange={(v) => setEditData({ ...editData, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">{t("crm.leads.statuses.new")}</SelectItem>
                <SelectItem value="contacted">{t("crm.leads.statuses.contacted")}</SelectItem>
                <SelectItem value="qualified">{t("crm.leads.statuses.qualified")}</SelectItem>
                <SelectItem value="unqualified">{t("crm.leads.statuses.unqualified")}</SelectItem>
                <SelectItem value="junk">{t("crm.leads.statuses.junk")}</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>{t("crm.leads.createdAt")}: <TimeAgo date={lead.created_at} /></p>
              {lead.converted_at && (
                <p>{t("crm.leads.fields.converted")}: <TimeAgo date={lead.converted_at} /></p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attachments */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t("crm.attachments.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AttachmentGallery
            entityType="leads"
            entityId={leadId}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
          />
        </CardContent>
      </Card>

      {/* Convert dialog */}
      <Dialog open={showConvert} onOpenChange={setShowConvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("crm.leads.convert.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4" />
                <span className="text-sm font-medium">{t("crm.leads.convert.createContact")}</span>
              </div>
              <Switch checked={convertContact} onCheckedChange={setConvertContact} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Handshake className="size-4" />
                <span className="text-sm font-medium">{t("crm.leads.convert.createDeal")}</span>
              </div>
              <Switch checked={convertDeal} onCheckedChange={setConvertDeal} />
            </div>
            {convertDeal && (
              <div className="space-y-3 pl-6 border-l-2">
                <div>
                  <Label>{t("crm.leads.convert.dealTitle")}</Label>
                  <Input value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} />
                </div>
                <div>
                  <Label>{t("crm.leads.convert.dealValue")}</Label>
                  <Input type="number" value={dealValue} onChange={(e) => setDealValue(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label>{t("crm.leads.convert.dealStage")}</Label>
                  <Select value={dealStageId} onValueChange={setDealStageId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvert(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleConvert} disabled={isConverting || (!convertContact && !convertDeal)}>
              {isConverting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {t("crm.leads.convert.button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
