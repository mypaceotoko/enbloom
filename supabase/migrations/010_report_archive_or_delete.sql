-- Admin-only report archive RPCs.
-- Archives keep report history in the database while hiding completed reports from
-- the default admin list.

alter table public.reports
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null;

create index if not exists reports_archived_at_created_at_idx
  on public.reports(archived_at, created_at desc);

create or replace function public.archive_report(p_report_id uuid)
returns table (
  success boolean,
  report_id uuid,
  archived_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can archive reports.';
  end if;

  if not exists (select 1 from public.reports r where r.id = p_report_id) then
    raise exception 'Report not found.';
  end if;

  if not exists (
    select 1
    from public.reports r
    where r.id = p_report_id
      and r.status in ('resolved', 'dismissed')
  ) then
    raise exception 'Only resolved or dismissed reports can be archived.';
  end if;

  return query
  update public.reports r
  set
    archived_at = now(),
    archived_by = auth.uid(),
    reviewed_at = coalesce(r.reviewed_at, now())
  where r.id = p_report_id
  returning true, r.id, r.archived_at;
end;
$$;

create or replace function public.unarchive_report(p_report_id uuid)
returns table (
  success boolean,
  report_id uuid,
  archived_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can unarchive reports.';
  end if;

  if not exists (select 1 from public.reports r where r.id = p_report_id) then
    raise exception 'Report not found.';
  end if;

  return query
  update public.reports r
  set
    archived_at = null,
    archived_by = null
  where r.id = p_report_id
  returning true, r.id, r.archived_at;
end;
$$;

revoke all on function public.archive_report(uuid) from public;
revoke all on function public.unarchive_report(uuid) from public;
grant execute on function public.archive_report(uuid) to authenticated;
grant execute on function public.unarchive_report(uuid) to authenticated;
