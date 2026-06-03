-- Invite code management policies for creator cleanup.
-- Used invite codes keep referral history, so RLS only allows deleting unused codes.

drop policy if exists "invite_codes_delete_unused_owner_or_admin" on public.invite_codes;
create policy "invite_codes_delete_unused_owner_or_admin"
  on public.invite_codes for delete
  using (
    used_count = 0
    and (created_by = auth.uid() or public.is_admin())
  );
