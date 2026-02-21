import { FormContent } from "./form-content";

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <FormContent slug={slug} />;
}
