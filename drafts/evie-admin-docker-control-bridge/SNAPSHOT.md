# Saved WIP Snapshot — Evie Admin Docker Control Bridge

**Status:** Draft source only. Do not deploy, merge, or run without completing the planned security fixes and reviewing configuration.

This snapshot preserves the 23-file Evie Admin Docker control bridge as a compressed source archive:

`source/evie-admin-docker-control-bridge.tar.xz`

## Extract the source locally

```bash
mkdir -p evie-admin-docker-control-bridge
tar -xJf source/evie-admin-docker-control-bridge.tar.xz -C evie-admin-docker-control-bridge
```

This includes `compose.yaml`, `Dockerfile`, FastAPI and SQLite backend modules, Telegram listener, outbound-only Docker control worker, Supabase relay and migration source, admin site assets, installer and tests, and setup notes. No real `.env`, Telegram sessions, or credentials were included.

## For later (not performed)

- Review authentication, admin authorization, request and event validation, Docker scope and least privilege
- Finish application integration, Supabase configuration and secure secret provisioning
- Run end-to-end Docker tests on a trusted host and validate logs, data retention and recovery
- Review Render/other CI deployment rules before merging into `main`

The current source is intentionally parked on a separate `wip/` branch. The public website and production services were not changed by this snapshot commit.
