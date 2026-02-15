import type { Metadata } from "next";
import { TasksContent } from "./tasks-content";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return <TasksContent />;
}
