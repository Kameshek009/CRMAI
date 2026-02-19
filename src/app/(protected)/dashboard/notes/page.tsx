import type { Metadata } from "next";
import { NotesContent } from "./notes-content";

export const metadata: Metadata = { title: "Notes" };

export default function NotesPage() {
  return <NotesContent />;
}
