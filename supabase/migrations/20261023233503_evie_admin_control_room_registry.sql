-- Evie Admin Control Room metadata registry. No credentials are stored here.
-- Supabase secret keys, Render tokens and bot tokens belong ONLY in server-side secrets.
create table if not exists public.evie_admin_connections (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(name) between 2 and 80),
 kind text not null check(kind in ('bot','agent','docker','webhook','service','other')),
 platform text not null default 'custom' check(char_length(platform) between 2 and 40),
 render_service_id text check(render_service_id is null or render_service_id ~ '^srv-[a-z0-9]{12,36}$'),
 endpoint_url text check(endpoint_url is null or (char_length(endpoint_url)<=500 and endpoint_url ~ '^https://[^[:space:]]+$')),
 secret_env_name text check(secret_env_name is null or secret_env_name ~ '^[A-Z][A-Z0-9_]{2,79}$'),
 notes text not null default '' check(char_length(notes)<=600),
 setup_state text not null default 'registered' check(setup_state in ('registered','needs_configuration','archived')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists evie_admin_connections_recent on public.evie_admin_connections(updated_at desc);
alter table public.evie_admin_connections enable row level security;
revoke all on public.evie_admin_connections from public,anon,authenticated;
grant all on public.evie_admin_connections to service_role;

create policy "Admin connection registry denies direct browser access"
on public.evie_admin_connections for select to authenticated using(false);

create table if not exists public.evie_admin_automation_drafts (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(name) between 2 and 100),
 trigger_type text not null check(trigger_type in ('manual','schedule','webhook','event')),
 schedule_description text not null default '' check(char_length(schedule_description)<=160),
 connection_id uuid references public.evie_admin_connections(id) on delete set null,
 notes text not null default '' check(char_length(notes)<=600),
 execution_state text not null default 'draft' check(execution_state='draft'),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists evie_admin_drafts_recent on public.evie_admin_automation_drafts(updated_at desc);
alter table public.evie_admin_automation_drafts enable row level security;
revoke all on public.evie_admin_automation_drafts from public,anon,authenticated;
grant all on public.evie_admin_automation_drafts to service_role;
create policy "Admin automation drafts deny direct browser access"
on public.evie_admin_automation_drafts for select to authenticated using(false);

create table if not exists public.evie_admin_events (
 id bigint generated always as identity primary key,
 event_type text not null check(char_length(event_type) between 3 and 70),
 resource_type text not null check(resource_type in ('connection','automation','admin')),
 resource_id uuid,
 actor_id uuid references auth.users(id) on delete set null,
 message text not null check(char_length(message)<=180),
 created_at timestamptz not null default now()
);
create index if not exists evie_admin_events_recent on public.evie_admin_events(created_at desc);
alter table public.evie_admin_events enable row level security;
revoke all on public.evie_admin_events from public,anon,authenticated;
grant all on public.evie_admin_events to service_role;
create policy "Admin audit events deny direct browser access"
on public.evie_admin_events for select to authenticated using(false);

comment on table public.evie_admin_connections is 'Admin-only integration references; NEVER put tokens, passwords, or webhook signing secrets in these rows.';
comment on table public.evie_admin_automation_drafts is 'Automation definitions are DRAFT ONLY; saving does not schedule, start, or run a worker.';
comment on table public.evie_admin_events is 'Admin-only audit of registry actions, not secret material.';
