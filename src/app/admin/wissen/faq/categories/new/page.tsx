import { requireAdmin } from "@/lib/auth-helpers";
import { FaqCategoryForm } from "@/components/admin/wissen/faq-category-form";

export default async function NewFaqCategoryPage() {
  await requireAdmin();
  return <FaqCategoryForm mode="create" initial={{}} />;
}
