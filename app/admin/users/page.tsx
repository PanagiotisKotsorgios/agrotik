import { createSupabaseService } from "@/lib/supabase/service";
import { Card, Badge, Eyebrow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { roleBadgeTone, roleLabel } from "@/lib/utils";
import { UserActions } from "./user-actions";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchPagination } from "@/components/site/search-pagination";

const PAGE_SIZE = 12;

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selectedRole = singleParam(params.role);
  const searchTerm = singleParam(params.q).trim();
  const svc = createSupabaseService();
  const supabase = await createSupabaseServer();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  let query = svc
    .from("profiles")
    .select("*, regions(name_el)")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (selectedRole === "farmer") query = query.in("role", ["farmer", "farmer_fisher"]);
  else if (selectedRole === "fisher") query = query.in("role", ["fisher", "farmer_fisher"]);
  else if (selectedRole) query = query.eq("role", selectedRole);

  const [{ data: users }, { data: authUsers }] = await Promise.all([
    query,
    svc.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const emailById = new Map((authUsers?.users ?? []).map((user) => [user.id, user.email]));
  const normalizedTerm = normalizeSearch(searchTerm);
  const filteredUsers = ((users as any[]) ?? []).filter((user) => {
    if (!normalizedTerm) return true;
    const searchable = [
      user.display_name,
      emailById.get(user.id),
      user.phone,
      user.municipality,
      user.regions?.name_el,
      user.region_code,
    ]
      .filter(Boolean)
      .join(" ");
    const normalizedSearchable = normalizeSearch(searchable);
    return (
      normalizedSearchable.includes(normalizedTerm) ||
      normalizedSearchable.replace(/\s+/g, "").includes(normalizedTerm.replace(/\s+/g, ""))
    );
  });
  const requestedPage = parsePage(params.page);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageUsers = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);

  const filters = [
    { v: "", l: "Όλοι" },
    { v: "farmer", l: "Αγρότες" },
    { v: "fisher", l: "Αλιείς" },
    { v: "farmer_fisher", l: "Αγρότες & Αλιείς" },
    { v: "merchant", l: "Έμποροι" },
    { v: "factory", l: "Εργοστάσια" },
    { v: "admin", l: "Διαχειριστές" },
  ];

  return (
    <>
      <div className="mb-6">
        <Eyebrow>Λογαριασμοί</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Χρήστες</h1>
      </div>

      <form action="/admin/users" method="get" className="mb-4 flex flex-col sm:flex-row gap-2">
        {selectedRole && <input type="hidden" name="role" value={selectedRole} />}
        <div className="relative flex-1">
          <Icon
            name="search"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
          />
          <Input
            type="search"
            name="q"
            defaultValue={searchTerm}
            placeholder="Αναζήτηση ονόματος, email, τηλεφώνου ή περιοχής…"
            className="pl-10"
            aria-label="Αναζήτηση χρηστών"
          />
        </div>
        <Button type="submit" icon="search">Αναζήτηση</Button>
        {searchTerm && (
          <Link
            href={selectedRole ? `/admin/users?role=${encodeURIComponent(selectedRole)}` : "/admin/users"}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-md border border-brand-border text-sm font-semibold text-brand-muted hover:text-brand-dark hover:border-brand-dark/40"
          >
            Καθαρισμός
          </Link>
        )}
      </form>

      <div className="mb-5 flex gap-2 text-sm overflow-x-auto pb-1">
        {filters.map((f) => (
          <Link
            key={f.v}
            href={roleFilterHref(f.v, searchTerm)}
            className={
              selectedRole === f.v
                ? "shrink-0 px-3 py-1.5 rounded-md border border-brand-dark bg-brand-dark text-white"
                : "shrink-0 px-3 py-1.5 rounded-md border border-brand-border bg-brand-surface hover:border-brand-dark/40"
            }
          >
            {f.l}
          </Link>
        ))}
      </div>

      <div
        id="admin-users-results"
        className="scroll-mt-24 mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="text-sm text-brand-muted flex items-center gap-2">
          <Icon name="users" /> <span className="figures">{filteredUsers.length}</span> χρήστες
          {filteredUsers.length > PAGE_SIZE && (
            <span className="figures">· {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredUsers.length)}</span>
          )}
        </div>
        <SearchPagination
          basePath="/admin/users"
          params={params}
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          pageSize={PAGE_SIZE}
          placement="top"
          resultsId="admin-users-results"
        />
      </div>

      <div className="space-y-2">
        {pageUsers.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/profile/${u.id}`} className="font-semibold text-brand-dark hover:underline truncate">
                    {u.display_name}
                  </Link>
                  <Badge tone={roleBadgeTone(u.role)}>{roleLabel(u.role)}</Badge>
                  {!u.is_active && <Badge tone="danger">Απενεργοποιημένος</Badge>}
                  {u.role !== "admin" && (
                    <Badge tone={u.is_public ? "ok" : "warn"}>
                      {u.is_public ? "Δημόσιο προφίλ" : "Κρυφό προφίλ"}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-brand-muted mt-1 flex flex-wrap items-center gap-2">
                  {emailById.get(u.id) && <span className="inline-flex items-center gap-1"><Icon name="envelope" /> {emailById.get(u.id)}</span>}
                  <span className="inline-flex items-center gap-1"><Icon name="location" /> {u.regions?.name_el ?? u.region_code}</span>
                  <span className="text-brand-border">·</span>
                  <span className="inline-flex items-center gap-1"><Icon name="phone" /> {u.phone}</span>
                </div>
              </div>
            </div>
            <UserActions
              userId={u.id}
              displayName={u.display_name}
              isActive={u.is_active}
              isPublic={u.is_public}
              role={u.role}
              isSelf={currentUser?.id === u.id}
            />
          </Card>
        ))}
        {pageUsers.length === 0 && (
          <Card className="text-brand-muted">
            <div className="flex items-center gap-2">
              <Icon name="info" /> Δεν βρέθηκαν χρήστες με αυτά τα κριτήρια.
            </div>
          </Card>
        )}
      </div>

      <SearchPagination
        basePath="/admin/users"
        params={params}
        currentPage={currentPage}
        totalItems={filteredUsers.length}
        pageSize={PAGE_SIZE}
        resultsId="admin-users-results"
      />
    </>
  );
}

function singleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePage(value: string | string[] | undefined): number {
  const page = Number.parseInt(singleParam(value) || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("el");
}

function roleFilterHref(role: string, searchTerm: string): string {
  const query = new URLSearchParams();
  if (role) query.set("role", role);
  if (searchTerm) query.set("q", searchTerm);
  return `/admin/users${query.size ? `?${query.toString()}` : ""}`;
}
