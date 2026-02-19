"use client";

import { useEffect } from "react";
import { SearchDialog } from "@/components/crm/search-dialog";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { useFeatureLimitStore } from "@/stores/feature-limit-store";
import { useWorkspace } from "@/contexts/team-context";

function FeatureLimitLoader() {
  const fetchLimits = useFeatureLimitStore((s) => s.fetch);
  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);
  return null;
}

function FeatureLimitUpgradeModal() {
  const { upgradeModal, closeUpgradeModal } = useFeatureLimitStore();
  const { currentWorkspace } = useWorkspace();

  if (!upgradeModal.isOpen) return null;

  return (
    <UpgradeModal
      isOpen
      onClose={closeUpgradeModal}
      reason="feature_limit_exceeded"
      currentTier={currentWorkspace?.tier || "free"}
      feature={upgradeModal.feature}
      featureCurrent={upgradeModal.current}
      featureLimit={upgradeModal.limit}
    />
  );
}

export function CrmOverlays() {
  return (
    <>
      <SearchDialog />
      <FeatureLimitLoader />
      <FeatureLimitUpgradeModal />
    </>
  );
}
