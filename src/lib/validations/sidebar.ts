import { z } from "zod";

const sidebarItemSchema = z.object({
  key: z.string().min(1).max(50),
  visible: z.boolean(),
});

const sidebarGroupSchema = z.object({
  groupKey: z.enum(["crm", "tools"]),
  items: z.array(sidebarItemSchema).min(1).max(20),
});

export const sidebarConfigSchema = z.array(sidebarGroupSchema).length(2);
