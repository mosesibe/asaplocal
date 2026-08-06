import { redirect } from "next/navigation";

export default async function UsersIndexPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  redirect(q ? `/users/customers?q=${encodeURIComponent(q)}` : "/users/customers");
}
