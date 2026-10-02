-- Vissel-Box: Zero-Knowledge Whistleblower SaaS Schema
-- Apply this to your Supabase project via SQL Editor
--
-- This is the COMPLETE schema, including the 'closed' status and the closed_at
-- column that the GDPR retention policy builds on. Run this first, then
-- supabase/gdpr_retention.sql.
--
-- Note: row level security on auth.users is already enabled by Supabase and
-- cannot be changed from the SQL editor (the postgres role does not own that
-- table), so it is deliberately not touched here.

-- 1. TENANTS (The Companies paying you)
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null, -- e.g., 'acme-corp'
  contact_email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  public_key text, -- STORES ONLY THE PUBLIC KEY (Safe)
  owner_id text not null, -- Link to Auth User ID (Clerk ID)
  status text default 'setup' check (status in ('setup', 'active')) -- setup -> active after key generation
);

-- 2. REPORTS (The Whistleblower submissions)
create table reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  encrypted_content text not null, -- THE GIBBERISH BLOB
  encrypted_attachments text, -- OPTIONAL: File encryption
  -- 'closed' = the investigation is finished. The GDPR retention job hard
  -- deletes reports that have been closed for more than 24 months.
  status text default 'new' check (status in ('new', 'read', 'archived', 'closed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  closed_at timestamp with time zone -- set when the status becomes 'closed'
);

-- Enable RLS on tables
alter table tenants enable row level security;
alter table reports enable row level security;

-- RLS POLICIES (Security)

-- Public can SELECT tenants (to get public key for encryption)
create policy "Public can view tenant public info" on tenants 
  for select 
  using (true);

-- Only owner can UPDATE their tenant
create policy "Owners can update their tenant" on tenants 
  for update 
  using (auth.uid()::text = owner_id);

-- Only owner can INSERT their tenant (during onboarding)
create policy "Authenticated users can create tenants" on tenants 
  for insert 
  with check (auth.uid()::text = owner_id);

-- Public can INSERT reports (Anonymous submission)
create policy "Public can insert reports" on reports 
  for insert 
  with check (true);

-- Only Tenant Owner can SELECT reports
create policy "Owners can view their reports" on reports 
  for select 
  using (
    auth.uid()::text = (select owner_id from tenants where id = reports.tenant_id)
  );

-- Only Tenant Owner can UPDATE reports (status changes)
create policy "Owners can update their reports" on reports 
  for update 
  using (
    auth.uid()::text = (select owner_id from tenants where id = reports.tenant_id)
  );

-- Create indexes for performance
create index idx_tenants_slug on tenants(slug);
create index idx_tenants_owner on tenants(owner_id);
create index idx_reports_tenant on reports(tenant_id);
create index idx_reports_status on reports(status);
create index idx_reports_created on reports(created_at desc);
-- Partial index for the retention job: only closed reports are ever scanned there
create index idx_reports_closed_at on reports(closed_at) where closed_at is not null;
