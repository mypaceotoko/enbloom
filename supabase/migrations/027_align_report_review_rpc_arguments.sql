-- Align update_report_review RPC argument names with the client payload.
-- PostgREST matches RPC JSON keys to function argument names, so keep these
-- names stable for report moderation updates from /admin.

drop function if exists public.update_report_review(uuid, text, text);

create function public.update_report_review(
  p_report_id uuid,
  p_status text default null,
  p_admin_note text default null
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

  next_status := coalesce(p_status, next_status);

  if next_status not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid report status.';
  end if;

  return query
  update public.reports r
  set
    status = next_status,
    admin_note = coalesce(p_admin_note, r.admin_note),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where r.id = p_report_id
  returning true, r.id, r.status, r.reviewed_at;
end;
$$;

revoke all on function public.update_report_review(uuid, text, text) from public;
grant execute on function public.update_report_review(uuid, text, text) to authenticated;
