import { requireAdmin } from "@/lib/auth-helpers";
import { CategoryForm } from "@/components/admin/wissen/category-form";

export default async function NewWissenCategoryPage() {
  await requireAdmin();
  return <CategoryForm mode="create" initial={{}} />;
}
