import { requireAdmin } from "@/lib/auth-helpers";
import { AuthorForm } from "@/components/admin/wissen/author-form";

export default async function NewWissenAuthorPage() {
  await requireAdmin();
  return <AuthorForm mode="create" initial={{}} />;
}
