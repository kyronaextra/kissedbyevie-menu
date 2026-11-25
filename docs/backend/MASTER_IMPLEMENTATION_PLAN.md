# Backend master implementation plan

Status: planning and reconciliation; not an applied migration.

Preserve existing production tables, records and application contracts. Inspect schema metadata and repository dependencies before proposing additive migrations. Keep the separate community platform database isolated.

## Modules

1. Schema inventory and migration reconciliation.
2. Authentication, owner authorization, MFA and session security.
3. Catalog, authoritative pricing, orders and checkout.
4. Memberships, entitlements and private delivery.
5. Customer identity mapping and consent.
6. Messaging synchronization and deduplication.
7. Financial reporting: confirmed transactions separate from claims.
8. Owner-approved assistant drafts and business intelligence.
9. Provider-independent AI routing, budgets and scoped memory.
10. Background jobs, retries, idempotency and emergency controls.
11. Integration configuration and server-side credential references.
12. Administration, publishing and health monitoring.
13. Privacy, export, retention and deletion.
14. Audit, recovery, performance and security regression tests.
15. Schema-only reconciliation of legacy community-platform objects.

## Delivery protocol

Generate dependency-ordered additive migrations, preconditions, verification and negative security tests, API contracts and recovery instructions. Explicitly review grants, RLS, ownership checks and function execution permissions. Test against a non-production environment before approval. Never reset production or fabricate migration history. Do not activate new integrations or send messages without authorization.

Maintain PROJECT_STATE, ARCHITECTURE, API_CONTRACTS, MIGRATION_MANIFEST, SECURITY_CHECKLIST, IMPLEMENTATION_BACKLOG and CHANGELOG in version control. Mark each item complete, partial, missing, unverified or blocked with evidence. Keep sensitive operational metadata, credentials and customer records out of public repositories.

## Current status

This document records requirements only. Full schema reconciliation, application dependency inspection, migration generation and testing remain outstanding. No database changes are authorized by this document.
