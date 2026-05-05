# Infrastructure boundaries

## Purpose

This document describes possible future infrastructure seams for self-hosted, local-first, and regulated deployments.

Mike already supports or is moving toward multiple LLM providers. For legal AI use cases, the trust model also depends on where documents, metadata, generated files, secrets, logs, authentication data, and database records are stored.

This is a documentation-only architecture note. It does not change runtime behavior or deployment defaults.

## Why this matters for legal AI

Legal workflows can involve privileged, confidential, regulated, or commercially sensitive material. The relevant deployment question is broader than which model processes a request.

Teams may also need to evaluate:

- where uploaded documents are stored
- where extracted metadata and generated files are stored
- which identity provider controls access
- where secrets and API keys live
- what gets logged
- how download URLs are signed and expired
- whether data leaves a firm-managed or locally controlled environment

Making infrastructure boundaries explicit would help future contributors reason about hosted, self-hosted, local-first, and regulated deployment profiles without implying that the current implementation is wrong.

## Current infrastructure areas

The main non-LLM infrastructure areas to keep visible are:

- Database records for users, projects, documents, workflows, chats, tabular reviews, and related metadata.
- Authentication and session identity.
- Object storage for uploaded, converted, and generated files.
- Secrets and configuration, including service keys and provider credentials.
- Logging and diagnostics.
- Download URL signing and file access controls.
- Deployment profiles that combine these choices into a coherent operating model.

## Suggested adapter boundaries

The following sections outline possible future adapter boundaries. They are not requirements for the current codebase and do not prescribe an implementation.

### Database

A future `DatabaseAdapter` boundary could make persistence more explicit while preserving the current application-level data model.

Possible implementations could include:

- Supabase/Postgres
- local Postgres
- SQLite

Postgres-compatible options are likely the closest fit for the current schema because they preserve:

- `uuid`
- `jsonb`
- `timestamptz`
- relational constraints
- migrations
- possible RLS support

SQLite may be useful for local-first or desktop-oriented profiles, but it would need careful treatment of schema differences, JSON behavior, migrations, concurrency, and access control.

### Storage

A future `StorageAdapter` boundary could preserve the same application-level document APIs while allowing different file backends.

Possible implementations could include:

- S3/R2
- MinIO
- local filesystem

The application should ideally continue to reason in terms of document keys, generated file keys, content types, and access checks rather than provider-specific storage details.

### Authentication

A future `AuthAdapter` boundary could separate user identity from a specific hosted auth provider.

Possible implementations could include:

- Supabase Auth
- local single-user auth
- OIDC / SSO

Legal and firm deployments may prefer OIDC or internal identity providers so access follows existing firm policies, lifecycle management, MFA, and audit requirements.

### Secrets and configuration

A future `SecretProvider` boundary could make sensitive configuration explicit.

Possible implementations could include:

- environment variables
- local encrypted config
- cloud secret manager

This boundary could cover service keys, storage credentials, signing keys, model provider credentials, and deployment-specific configuration.

### Logging

Legal workflows need careful logging boundaries because prompts, document contents, extracted clauses, citations, model outputs, filenames, and user messages may contain confidential material.

A future `Logger` boundary could make logging behavior configurable by deployment profile.

Possible implementations could include:

- local dev logger
- production logger
- redacted logger
- no-persistence logger

The most important design property is clarity about what is logged, where it is stored, how long it is retained, and whether sensitive content is redacted.

### Download URL signing

Download URL signing is a separate trust boundary from storage. A deployment may store files in one place while signing download access through another mechanism.

A future signing boundary could cover:

- short-lived signed storage URLs
- application-issued download tokens
- local filesystem paths for desktop deployments
- provider-specific signed URL APIs

The application-level behavior should remain consistent: a user can only download files they are authorized to access, and generated URLs or tokens should expire.

## Example deployment profiles

These profiles are examples of possible future directions. They are not current deployment requirements.

### Hosted demo

- Database: Supabase/Postgres
- Auth: Supabase Auth
- Storage: R2/S3
- Secrets: environment/cloud config
- LLM: user-provided API keys

This profile favors low setup cost and a hosted developer experience.

### Self-hosted firm deployment

- Database: Postgres
- Auth: OIDC or internal SSO
- Storage: MinIO or S3-compatible storage
- Secrets: environment variables or secret manager
- LLM: firm-managed provider, local inference, or user-provided API keys

This profile favors firm-controlled identity, storage, secrets, and data residency.

### Local desktop deployment

- Database: SQLite or local Postgres
- Auth: local password
- Storage: local filesystem
- Secrets: local config
- LLM: user-provided API keys or local inference

This profile favors local-first control and minimal external infrastructure.

## Incremental implementation path

A possible future implementation path could be incremental:

1. Document current infrastructure touchpoints and data flows.
2. Define small TypeScript interfaces for one boundary at a time.
3. Move current behavior behind default adapters without changing behavior.
4. Add tests around the application-level contract for each boundary.
5. Add alternative adapters only after the boundary is stable.
6. Document deployment profiles and tradeoffs as they become supported.

This keeps the architecture reviewable and avoids turning infrastructure flexibility into a rewrite.

## Non-goals

This document does not:

- Remove Supabase.
- Remove R2/S3.
- Change runtime behavior.
- Change authentication.
- Add new database support.
- Add SQLite or Postgres adapters.
- Add MinIO support.
- Add OIDC support.
- Refactor infrastructure code.
- Change migrations.
- Change deployment defaults.
