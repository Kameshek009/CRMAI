import { describe, it, expect } from "vitest";
import { FEATURE_LABELS } from "@/lib/crm/feature-labels";
import type { FeatureLimitKey } from "@/types";

const ALL_FEATURE_KEYS: FeatureLimitKey[] = [
  "contacts",
  "companies",
  "deals",
  "tasks",
  "customFields",
  "activeAutomations",
  "pipelineStages",
  "emailTemplates",
  "emailSequences",
  "visibilityGroups",
  "teamMembers",
];

describe("FEATURE_LABELS", () => {
  it("has a label for every FeatureLimitKey", () => {
    for (const key of ALL_FEATURE_KEYS) {
      expect(FEATURE_LABELS[key]).toBeDefined();
    }
  });

  it("has no extra keys beyond FeatureLimitKey values", () => {
    const keys = Object.keys(FEATURE_LABELS);
    expect(keys).toHaveLength(ALL_FEATURE_KEYS.length);
  });

  it("all values are non-empty strings", () => {
    for (const key of ALL_FEATURE_KEYS) {
      const label = FEATURE_LABELS[key];
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("maps contacts to 'Contacts'", () => {
    expect(FEATURE_LABELS.contacts).toBe("Contacts");
  });

  it("maps companies to 'Companies'", () => {
    expect(FEATURE_LABELS.companies).toBe("Companies");
  });

  it("maps deals to 'Deals'", () => {
    expect(FEATURE_LABELS.deals).toBe("Deals");
  });

  it("maps tasks to 'Tasks'", () => {
    expect(FEATURE_LABELS.tasks).toBe("Tasks");
  });

  it("maps customFields to 'Custom Fields'", () => {
    expect(FEATURE_LABELS.customFields).toBe("Custom Fields");
  });

  it("maps activeAutomations to 'Active Automations'", () => {
    expect(FEATURE_LABELS.activeAutomations).toBe("Active Automations");
  });

  it("maps pipelineStages to 'Pipeline Stages'", () => {
    expect(FEATURE_LABELS.pipelineStages).toBe("Pipeline Stages");
  });

  it("maps emailTemplates to 'Email Templates'", () => {
    expect(FEATURE_LABELS.emailTemplates).toBe("Email Templates");
  });

  it("maps emailSequences to 'Email Sequences'", () => {
    expect(FEATURE_LABELS.emailSequences).toBe("Email Sequences");
  });

  it("maps visibilityGroups to 'Visibility Groups'", () => {
    expect(FEATURE_LABELS.visibilityGroups).toBe("Visibility Groups");
  });

  it("maps teamMembers to 'Team Members'", () => {
    expect(FEATURE_LABELS.teamMembers).toBe("Team Members");
  });
});
