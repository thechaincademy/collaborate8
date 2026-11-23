-- Families Change campaign pledges (collaborate8.com/families-change)
-- Written only by the submit-pledge edge function (service role). No public read.

create table if not exists public.families_change_pledges (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  organisation text not null,
  email text not null,
  org_type text,
  families_reach integer,
  postcode text,
  pledge_options text[] not null,
  public_listing boolean not null default false,
  user_agent text
);

alter table public.families_change_pledges enable row level security;

-- No policies: table is inaccessible to anon and authenticated roles.
-- The submit-pledge edge function uses the service role and bypasses RLS.
