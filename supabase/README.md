# EnBloom Supabase

This directory contains Supabase preparation assets for EnBloom Phase 3 前半.

## Files

- `migrations/001_initial_schema.sql` — initial schema proposal, indexes, `updated_at` triggers, and RLS policy draft.

## Current scope

This is preparation only. The current localStorage-based demo experience remains the active app behavior until the next implementation phase connects Auth and database reads/writes.

Do **not** treat this directory as a completed production backend yet. Before production launch, review RLS, legal requirements, age/identity verification, moderation workflows, Storage policies, and Google Auth settings.
