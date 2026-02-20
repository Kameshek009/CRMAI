import type { Metadata } from "next";
import { TrashContent } from "./trash-content";

export const metadata: Metadata = { title: "Trash" };

export default function TrashPage() {
  return <TrashContent />;
}
