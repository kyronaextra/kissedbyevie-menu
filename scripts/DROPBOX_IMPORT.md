# Secure Dropbox → Daddy vault importer

This **optional local admin tool** inventories a Dropbox shared folder (including
subfolders) and imports photos/videos into the **private** Supabase Storage bucket
`evie-daddy-vault` with their metadata in `public.evie_daddy_media`.

It is **not** run in the public website or its build pipeline. Never put any
access token, secret service-role key or Dropbox shared link in GitHub or browser JS.

## Requirements
- Node.js 20+ on a trusted machine.
- A Dropbox API OAuth token with `files.metadata.read` and `sharing.read`.
- Your original Dropbox shared folder URL, configured **locally** as
  `DROPBOX_SHARED_LINK`.
- For actual copying: Supabase project URL, a **service role key used locally only**,
  and sufficient storage quota.
- Check that everyone in the collection is an adult and that publishing rights
  and any required identity/age checks are complete.
- This tool defaults to **dry run**: it will only inventory file counts and
  estimated storage. It cannot check Dropbox until credentials are supplied.

### Run (PowerShell, on your machine)

```powershell
$env:DROPBOX_ACCESS_TOKEN = '<your Dropbox OAuth token>'
$env:DROPBOX_SHARED_LINK = '<the shared folder link>'
node scripts/dropbox-to-vault.mjs
```

After checking space, file sizes, and dates, for the **explicit upload**:

```powershell
$env:SUPABASE_URL = 'https://cmjhecwwjoeqpcownkol.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '<secret from YOUR Supabase settings>'
node scripts/dropbox-to-vault.mjs --upload
```

Do **not** paste the service-role key into ChatGPT, GitHub, the website,
Render static-site environment or screenshots. Clear sensitive PowerShell
environment variables when finished.

Each file uses its Dropbox server-modified timestamp for date sorting.
**That timestamp isn't guaranteed to be the original upload date.**
Individual files above the default 50 MB cap are reported and skipped; adjust
`EVIE_MAX_SINGLE_FILE_MB` only if your Supabase project's actual upload
limits permit it. For reliable large videos, use a resumable/multipart uploader
and check video encoding compatibility. Some formats may not play in all browsers.

The import is idempotent by Dropbox file ID: reruns add newly discovered files
and skip files already indexed. It does not remove deleted Dropbox files or
update an already-indexed file's bytes. Review changes manually before any
replacements or deletions.

The website serves media only via short-lived Supabase **private signed URLs**,
with Daddy membership and age-verification RLS checks. Favorites are per member.

References:
- https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/list-folder
- https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/sharing/get-shared-link-file
- https://supabase.com/docs/guides/storage/buckets/fundamentals
