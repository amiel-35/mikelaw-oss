# Access model

## Purpose

This document describes Mike's current application-level access model and a possible future authorization boundary.

It is documentation-only. It does not change authentication, authorization, database policies, or runtime behavior.

## Current model

Mike currently appears to use a multi-user, owner-based access model with resource sharing.

The current model is not a full organization or tenant model. There is no central `tenant_id`, `organization_id`, workspace membership table, or role hierarchy that scopes every resource. Instead, access is primarily determined by:

- the authenticated user id
- resource ownership through `user_id`
- email-based sharing fields
- workflow-specific share rows
- route-level checks and shared backend access helpers

This model is a practical fit for a single deployed instance used by one organization or a small group of users. A multi-tenant SaaS model with organization-level isolation would be a separate future architecture track.

## Authentication

Requests are authenticated by backend middleware that validates a bearer token with Supabase Auth and stores the current user id and email on the response locals.

Conceptually, authentication answers:

```txt
Who is the current user?
```

The current authenticated user shape used by authorization checks is effectively:

```txt
userId
userEmail
```

## Authorization

Authorization answers:

```txt
What can this user access or change?
```

The current authorization model is mostly enforced in backend route handlers and helpers. The central helper module is `backend/src/lib/access.ts`, which includes checks for projects, documents, reviews, and accessible project ids.

## Resource ownership and sharing

### Projects

Projects are owned by a user through `projects.user_id`.

Project sharing is email-based through `projects.shared_with`.

The effective project access rule is:

```txt
User can access project if:
- projects.user_id equals current user id, or
- current user email appears in projects.shared_with
```

Some operations remain owner-only, such as member management or destructive project operations.

### Documents

Documents are owned by a user through `documents.user_id`.

Documents can also be accessible indirectly through their project:

```txt
User can access document if:
- documents.user_id equals current user id, or
- document belongs to a project the user can access
```

Standalone documents without a project are only accessible to their owner.

### Tabular reviews

Tabular reviews are owned by a user through `tabular_reviews.user_id`.

They can be shared in two ways:

- indirectly through a shared project
- directly through `tabular_reviews.shared_with`

The effective review access rule is:

```txt
User can access review if:
- tabular_reviews.user_id equals current user id, or
- current user email appears in tabular_reviews.shared_with, or
- review belongs to a project the user can access
```

### Workflows

Custom workflows are owned by a user through `workflows.user_id`.

Workflow sharing uses a dedicated `workflow_shares` table.

The effective workflow access rule is:

```txt
User can access workflow if:
- workflows.user_id equals current user id, or
- workflow_shares has a row for the workflow and current user email
```

Workflow edit access also depends on:

```txt
workflow_shares.allow_edit
```

System workflows are read-only application workflows and are not edited through the same custom workflow update path.

### Chats

Chats are owned by `chats.user_id`.

Project chats may also be visible through project access, depending on route behavior. Chat authorization should remain aligned with project access rules so shared project users can only see chats that belong to projects they can access.

## Current limitations

The current model is useful and understandable, but it is not yet a centralized authorization system.

Important limitations to keep in mind:

- Access checks are partly centralized and partly implemented in route handlers.
- Sharing is mostly email-based rather than membership-table-based.
- There is no explicit organization or tenant boundary.
- There is no general role model such as admin, lawyer, paralegal, client, or viewer.
- There is no general permission vocabulary such as `document.read` or `project.share`.
- Database RLS is not the main enforcement mechanism for most application resources.

These limitations do not make the current model wrong. They define the boundary for future self-hosted, firm-managed, or regulated deployments.

## Suggested authorization boundary

A future `AuthorizationService` could centralize access decisions while preserving current behavior.

Possible interface shape:

```ts
type CurrentUser = {
  id: string;
  email: string | null;
};

type AccessResult = {
  ok: boolean;
  isOwner?: boolean;
  allowEdit?: boolean;
};

interface AuthorizationService {
  canAccessProject(user: CurrentUser, projectId: string): Promise<AccessResult>;
  canManageProject(user: CurrentUser, projectId: string): Promise<AccessResult>;
  canAccessDocument(user: CurrentUser, documentId: string): Promise<AccessResult>;
  canAccessReview(user: CurrentUser, reviewId: string): Promise<AccessResult>;
  canAccessWorkflow(user: CurrentUser, workflowId: string): Promise<AccessResult>;
  canEditWorkflow(user: CurrentUser, workflowId: string): Promise<AccessResult>;
}
```

The first implementation could be a `PostgresAuthorizationService` or `SupabaseAuthorizationService` that reproduces the current rules exactly.

## Relationship to auth providers

Authentication and authorization should remain separate boundaries.

An auth provider verifies identity:

```txt
Supabase Auth
local auth
OIDC / SSO
```

An authorization service decides access:

```txt
owner
shared project member
shared review member
workflow share recipient
workflow editor
```

This separation would allow future deployments to change how users sign in without changing the application access rules at the same time.

## Possible future directions

Future work could move in small steps:

1. Document all current access checks and the routes that depend on them.
2. Move duplicated route-level checks into a shared `AuthorizationService`.
3. Keep the initial implementation behavior-compatible with the current model.
4. Add tests for owner, shared user, and unauthorized user cases.
5. Introduce an `AuthProvider` boundary separately.
6. Consider organization or tenant-level modeling only if Mike targets multi-organization SaaS deployments.

For self-hosted deployments, the simpler initial assumption can remain:

```txt
one Mike instance per organization
multiple users inside that instance
resource sharing inside that instance
```

## Non-goals

This document does not:

- Change authorization behavior.
- Add a tenant or organization model.
- Add roles or permissions.
- Add database RLS policies.
- Replace Supabase Auth.
- Add OIDC, SSO, or local auth.
- Refactor route handlers.
- Change migrations.
- Change sharing behavior.
