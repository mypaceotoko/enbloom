-- Harden admin report status updates for environments that have reports but may
-- be missing the latest Founder/Admin helper or report update policy/RPC.
-- This keeps report reads unchanged and only allows Founder/Admin accounts to
-- update moderation fields.

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id = user_id
      and (
        p.role = 'admin'
        or lower(trim(coalesce(u.email, ''))) = 'mypaceotoko@gmail.com'
      )
  );
$$;

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.update_report_review(
  p_report_id uuid,
  new_status text default null,
  new_admin_note text default null
)
returns table (
  success boolean,
  report_id uuid,
  status text,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can update report reviews.';
  end if;

  select r.status into next_status
  from public.reports r
  where r.id = p_report_id;

  if next_status is null then
    raise exception 'Report not found.';
  end if;

  next_status := coalesce(new_status, next_status);

  if next_status not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid report status.';
  end if;

  return query
  update public.reports r
  set
    status = next_status,
    admin_note = coalesce(new_admin_note, r.admin_note),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where r.id = p_report_id
  returning true, r.id, r.status, r.reviewed_at;
end;
$$;

revoke all on function public.update_report_review(uuid, text, text) from public;
grant execute on function public.update_report_review(uuid, text, text) to authenticated;
