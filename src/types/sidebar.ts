export interface SidebarItemConfig {
  key: string;
  visible: boolean;
}

export interface SidebarGroupConfig {
  groupKey: "crm" | "tools";
  items: SidebarItemConfig[];
}

export type SidebarConfig = SidebarGroupConfig[];
