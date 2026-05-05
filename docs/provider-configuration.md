# Provider configuration

## Purpose

This document describes a possible future configuration model for choosing Mike infrastructure providers.

It is documentation-only. It does not change runtime behavior, environment variable requirements, deployment defaults, or provider implementations.

## Configuration model

Provider selection should be explicit and centralized.

Possible future configuration keys:

```txt
MIKE_DATABASE_PROVIDER=supabase-postgres | postgres
MIKE_AUTH_PROVIDER=supabase | local | oidc
MIKE_STORAGE_PROVIDER=s3 | azure-blob | local
MIKE_MAIL_PROVIDER=resend | smtp | noop
```

The default values should preserve current behavior. Alternative providers can be added only after the relevant adapter boundary exists.

## Design principles

Provider configuration should:

- keep current hosted behavior as the default
- avoid feature flags scattered across route handlers
- fail fast when required provider-specific settings are missing
- keep authentication separate from authorization
- keep storage separate from download authorization
- make self-hosted deployment profiles easier to document and test
- avoid requiring a multi-tenant SaaS model for single-tenant deployments

## Database provider

Suggested key:

```txt
MIKE_DATABASE_PROVIDER=supabase-postgres | postgres
```

`supabase-postgres` means the current Supabase-backed Postgres setup.

`postgres` would mean a direct Postgres connection for self-hosted deployments.

Provider-specific settings could include:

```txt
SUPABASE_URL=
SUPABASE_SECRET_KEY=
DATABASE_URL=
```

Postgres-compatible providers are the first practical target because the current schema relies on:

- `uuid`
- `jsonb`
- `timestamptz`
- relational constraints
- migrations
- possible RLS support

SQLite may still be useful for local-first or desktop deployments, but it should be treated as a separate future profile because the schema and concurrency behavior differ.

## Auth provider

Suggested key:

```txt
MIKE_AUTH_PROVIDER=supabase | local | oidc
```

Possible providers:

- `supabase`: current Supabase Auth behavior.
- `local`: local single-instance auth for development or simple self-hosted deployments.
- `oidc`: external identity provider for firm SSO.

Provider-specific settings could include:

```txt
SUPABASE_URL=
SUPABASE_SECRET_KEY=
LOCAL_AUTH_SECRET=
OIDC_ISSUER_URL=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_REDIRECT_URI=
```

Auth providers should answer:

```txt
Who is the current user?
```

They should not directly encode document, project, workflow, or review permissions. Those rules belong in an authorization boundary.

## Storage provider

Suggested key:

```txt
MIKE_STORAGE_PROVIDER=s3 | azure-blob | local
```

Possible providers:

- `s3`: S3-compatible object storage such as AWS S3, Cloudflare R2, MinIO, Wasabi, or similar providers.
- `azure-blob`: Azure Blob Storage, if direct Azure support is added.
- `local`: local filesystem storage for local-first or desktop profiles.

Provider-specific settings could include:

```txt
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=
AZURE_STORAGE_ACCOUNT=
AZURE_STORAGE_CONTAINER=
AZURE_STORAGE_CONNECTION_STRING=
LOCAL_STORAGE_DIR=
```

The application-level storage API should stay stable:

```txt
upload file
download file
delete file
generate provider-specific signed URL when supported
```

Download authorization should remain a separate concern from object storage.

## Mail provider

Suggested key:

```txt
MIKE_MAIL_PROVIDER=resend | smtp | noop
```

Possible providers:

- `resend`: current or hosted email provider behavior where applicable.
- `smtp`: self-hosted or firm-managed SMTP.
- `noop`: local development mode that records or ignores outbound email.

Provider-specific settings could include:

```txt
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

The mail provider should be optional until a deployment profile actually requires outbound email.

## Hosted demo profile

Example configuration shape:

```txt
MIKE_DATABASE_PROVIDER=supabase-postgres
MIKE_AUTH_PROVIDER=supabase
MIKE_STORAGE_PROVIDER=s3
MIKE_MAIL_PROVIDER=resend
```

Typical dependencies:

- Database: Supabase/Postgres
- Auth: Supabase Auth
- Storage: R2/S3-compatible storage
- Mail: Resend or hosted provider
- LLM: user-provided API keys or hosted provider keys

This profile favors low setup cost and a hosted developer experience.

## Self-hosted firm profile

Example configuration shape:

```txt
MIKE_DATABASE_PROVIDER=postgres
MIKE_AUTH_PROVIDER=oidc
MIKE_STORAGE_PROVIDER=s3
MIKE_MAIL_PROVIDER=smtp
```

Typical dependencies:

- Database: firm-managed Postgres
- Auth: OIDC / SSO
- Storage: MinIO or S3-compatible storage
- Mail: SMTP
- LLM: firm-managed provider, local inference, or user-provided API keys

This profile favors firm-controlled identity, storage, secrets, and data residency.

## Local desktop profile

Example configuration shape:

```txt
MIKE_DATABASE_PROVIDER=postgres
MIKE_AUTH_PROVIDER=local
MIKE_STORAGE_PROVIDER=local
MIKE_MAIL_PROVIDER=noop
```

Typical dependencies:

- Database: local Postgres first, SQLite only if explicitly supported later
- Auth: local password or single-user mode
- Storage: local filesystem
- Mail: noop
- LLM: user-provided API keys or local inference

This profile favors local control and minimal external infrastructure.

## Startup validation

A future provider config loader should validate configuration at startup.

Examples:

- `MIKE_STORAGE_PROVIDER=s3` requires bucket and credentials.
- `MIKE_AUTH_PROVIDER=oidc` requires issuer, client id, client secret, and redirect URI.
- `MIKE_DATABASE_PROVIDER=postgres` requires `DATABASE_URL`.
- `MIKE_MAIL_PROVIDER=noop` should not require mail credentials.

Invalid provider combinations should fail early with clear error messages.

## Incremental implementation path

Possible future path:

1. Add a central config loader that reads provider names and validates values.
2. Keep current provider values as defaults.
3. Introduce one adapter boundary at a time.
4. Move current behavior behind default adapters.
5. Add alternative providers only after the default adapter is behavior-compatible.
6. Document supported deployment profiles once they are tested.

## Non-goals

This document does not:

- Add provider selection code.
- Add new environment variables.
- Change runtime defaults.
- Replace Supabase.
- Replace S3/R2 storage.
- Add OIDC, local auth, SMTP, MinIO, Azure Blob, SQLite, or local filesystem support.
- Add Docker Compose.
- Change migrations.
