export const dynamic = "force-dynamic";

import Link from "next/link";
import { format } from "date-fns";
import { Search, Shield, User } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { UserDeleteButton } from "@/components/admin/user-delete-button";

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const search = params.search ?? "";
  const skip = (page - 1) * ADMIN_ITEMS_PER_PAGE;
  const currentUserId = session.user.id;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: ADMIN_ITEMS_PER_PAGE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / ADMIN_ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">
          Manage registered users ({total} total)
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search users by name or email..."
                defaultValue={search}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {search && (
              <Button asChild variant="ghost">
                <Link href="/admin/users">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <TableRow
                      key={user.id}
                      className={cn(isSelf && "bg-muted/50")}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            {user.role === "ADMIN" ? (
                              <Shield className="h-4 w-4 text-primary" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-medium">
                            {user.name ?? "No name"}
                          </span>
                          {isSelf && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <UserRoleSelect
                          userId={user.id}
                          currentRole={user.role}
                          isSelf={isSelf}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {user._count.orders}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <UserDeleteButton
                          userId={user.id}
                          isSelf={isSelf}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {search
                        ? "No users match your search."
                        : "No users found."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {skip + 1}-{Math.min(skip + ADMIN_ITEMS_PER_PAGE, total)} of{" "}
            {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/admin/users?page=${page - 1}${search ? `&search=${search}` : ""}`}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/admin/users?page=${page + 1}${search ? `&search=${search}` : ""}`}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
