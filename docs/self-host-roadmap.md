# Self-host roadmap

## Purpose

This roadmap tracks a pragmatic path for self-hosted, single-tenant Mike deployments.

It is intended for the fork integration branch. Upstream pull requests can remain smaller and easier to review.

## Deployment assumption

The first self-hosting target should be single-tenant:

```txt
one Mike instance
one organization or firm
multiple internal users
resource sharing inside the instance
```

This avoids introducing a full multi-tenant SaaS model before the infrastructure boundaries are stable.

## Current foundation

The fork already has documentation and low-risk tooling for:

- infrastructure boundaries
- current access model and authorization boundary
- declarative workflow/prompt pack format
- workflow pack validation
- workflow pack import dry-run

## Recommended sequence

### 1. Provider configuration

Document and then centralize infrastructure provider selection.

Possible configuration keys:

```txt
MIKE_DATABASE_PROVIDER=supabase-postgres | postgres
MIKE_AUTH_PROVIDER=supabase | local | oidc
MIKE_STORAGE_PROVIDER=s3 | azure-blob | local
MIKE_MAIL_PROVIDER=resend | smtp | noop
```

The default providers should preserve current behavior.

### 2. Authorization service

Centralize existing access checks behind an `AuthorizationService`.

Initial goal:

- preserve current behavior exactly
- keep owner/shared-user semantics
- cover projects, documents, reviews, workflows, and chats
- add tests for owner, shared user, and unauthorized user cases

### 3. Auth provider

Introduce an `AuthProvider` boundary.

Initial implementation:

- `SupabaseAuthProvider`

Future implementations:

- local auth
- OIDC / SSO

Authentication should answer who the user is. Authorization should remain separate.

### 4. Storage adapter

Introduce a `StorageAdapter` boundary.

Initial implementation:

- current S3/R2-compatible storage behavior

Future implementations:

- MinIO through S3-compatible configuration
- Azure Blob adapter
- local filesystem adapter

### 5. Mail provider

Introduce a `MailProvider` boundary if email becomes part of self-hosted workflows.

Possible implementations:

- Resend
- SMTP
- noop provider for local development

### 6. Database boundary

Move database usage toward repositories or a database adapter only after access rules are centralized.

Initial self-host target:

- Postgres-compatible database

Future options:

- local Postgres
- Supabase/Postgres
- SQLite for local-first profiles, if schema differences are explicitly handled

### 7. Docker Compose profile

Add Docker Compose once database, auth, and storage seams are clear enough.

Initial target:

```txt
frontend
backend
postgres
minio
```

Auth can start with the current provider or a deliberately limited local mode. OIDC can come later.

## Upstream strategy

Keep upstream pull requests small:

1. Documentation-only PRs.
2. Boundary-preserving refactors.
3. Behavior-compatible default adapters.
4. Optional alternative providers.

The fork can move faster on an integration branch while upstream review remains low-risk.

## Non-goals

This roadmap does not require:

- a multi-tenant SaaS model
- tenant ids across every table
- replacing Supabase immediately
- replacing R2/S3 immediately
- introducing Docker before provider boundaries are clear
- changing runtime defaults in the first refactor PRs
