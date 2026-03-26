# Auth Module Simplification — Implementation Guide

> **Audience:** Junior programmer / cheap model
> **Rule:** Do NOT change any endpoint path, request shape, or response shape.
> **Rule:** Run `bun run lint` and `bun run test` after every step before moving to the next.
> **Rule:** Commit after each step. Format: `refactor(auth): step N - <short description>`

---

## Why We Are Doing This

1. The function `mapUserAcl` is copy-pasted in two files. We will extract it to one place.
2. The Prisma include object `userAclInclude` is copy-pasted in two files. We will extract it to one place.
3. Types `UserWithAcl` and `UserWithAclRelations` live inside the auth folder but are used by the user folder too. We will move them to a shared folder.
4. JWT access token signing passes the secret manually even though `JwtModule` already has it registered. We will remove the redundant manual pass.
5. Guards are used in `UserModule` and `PostModule` without those modules formally declaring `AuthModule` as a dependency. We will make that explicit.

---

## Step 1 — Create the shared types file

**Create this new file:** `src/common/types/user.types.ts`

Paste exactly this content:

```ts
import type {
  User,
  UserRole,
  UserPermission,
  Role,
  RolePermission,
  Permission,
} from '@prisma/client';

export type UserWithAclRelations = User & {
  roles: (UserRole & {
    role: Role & {
      permissions: (RolePermission & {
        permission: Permission;
      })[];
    };
  })[];
  permissions: (UserPermission & {
    permission: Permission;
  })[];
};

export type UserWithAcl = User & {
  roles: string[];
  permissions: string[];
};
```

✅ Run: `bun run lint` — must pass with no errors.

---

## Step 2 — Create the shared ACL utility file

**Create this new file:** `src/common/acl/acl.util.ts`

Paste exactly this content:

```ts
import type { UserWithAclRelations, UserWithAcl } from '../types/user.types';

export const userAclInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
  permissions: {
    include: { permission: true },
  },
} as const;

export function mapUserAcl(user: UserWithAclRelations): UserWithAcl {
  const roles = user.roles.map((ur) => ur.role.name);
  const rolePermissions = user.roles.flatMap(
    (ur) => ur.role.permissions?.map((rp) => rp.permission.name) || [],
  );
  const directPermissions =
    user.permissions?.map((up) => up.permission.name) || [];
  const permissions = [...new Set([...rolePermissions, ...directPermissions])];
  return { ...user, roles, permissions };
}
```

✅ Run: `bun run lint` — must pass with no errors.

---

## Step 3 — Update `src/auth/interfaces/auth.interface.ts`

**Remove** these three things from the file:
- The import of `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `UserPermission` from `@prisma/client` (these are no longer needed here)
- The `UserWithAclRelations` type definition
- The `UserWithAcl` type definition
- The `UserListResponseDto` interface (dead code — not used anywhere in auth)

**Add** this import at the top of the file:
```ts
import type { UserWithAcl } from '../../common/types/user.types';
export type { UserWithAcl };
```

> Note: We re-export `UserWithAcl` so any existing import from `auth.interface.ts` that uses `UserWithAcl` keeps working. We do NOT re-export `UserWithAclRelations` — those callers will be updated in later steps.

**Keep** all other types exactly as they are:
- `AuthUser`
- `JwtPayload`
- `LoginResponse`
- `RequestWithUser`
- `RequestWithCookies`

✅ Run: `bun run lint` — must pass with no errors.

---

## Step 4 — Update `src/auth/auth.repository.ts`

**Find and remove** this block (the private property, around lines 10–29):
```ts
private readonly userAclInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
  permissions: {
    include: { permission: true },
  },
};
```

**Replace the import** at the top of the file:
```ts
// Remove this line:
import { UserWithAclRelations } from './interfaces/auth.interface';

// Add these two lines instead:
import { UserWithAclRelations } from '../common/types/user.types';
import { userAclInclude } from '../common/acl/acl.util';
```

No other changes in this file. The places where `this.userAclInclude` is used should now just use `userAclInclude` (without `this.`).

**Find all uses of `this.userAclInclude`** in the file and replace with `userAclInclude` (there should be about 4 occurrences — one per `findUserBy*` method and `createUser`).

✅ Run: `bun run test -- auth.repository` (if a spec exists) or `bun run lint` — must pass.

---

## Step 5 — Update `src/user/user.repository.ts`

Same pattern as Step 4.

**Find and remove** the `private readonly userAclInclude = { ... }` block (around lines 10–29).

**Replace the import** at the top of the file:
```ts
// Remove this line:
import { UserWithAclRelations } from '../auth/interfaces/auth.interface';

// Add these two lines instead:
import { UserWithAclRelations } from '../common/types/user.types';
import { userAclInclude } from '../common/acl/acl.util';
```

**Find all uses of `this.userAclInclude`** and replace with `userAclInclude` (without `this.`).

✅ Run: `bun run test -- user.repository` — must pass. Then `bun run lint`.

---

## Step 6 — Update `src/auth/auth.service.ts`

### 6a — Replace the `mapUserAcl` method

**Find and remove** the private method (around lines 70–86):
```ts
private mapUserAcl(user: UserWithAclRelations): UserWithAcl {
  const roles = user.roles.map((ur) => ur.role.name);
  const rolePermissions = user.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.name),
  );
  const directPermissions = user.permissions.map((up) => up.permission.name);
  const permissions = [...new Set([...rolePermissions, ...directPermissions])];
  return { ...user, roles, permissions };
}
```

**Update imports** at the top:
```ts
// Remove from the './interfaces/auth.interface' import line:
//   UserWithAclRelations, UserWithAcl
// (keep AuthUser, JwtPayload, LoginResponse — those stay)

// Add these imports:
import { UserWithAclRelations, UserWithAcl } from '../common/types/user.types';
import { mapUserAcl } from '../common/acl/acl.util';
```

All existing calls to `this.mapUserAcl(user)` in the service should now become `mapUserAcl(user)` (plain function call, no `this`).

### 6b — Simplify JWT access token signing

In the `login()` method, find this call:
```ts
jwtService.sign(payload, { secret: appConfig.jwt.secret, expiresIn: appConfig.jwt.expiration })
```
Replace with:
```ts
jwtService.sign(payload)
```
(JwtModule already has the secret and expiration registered — no need to repeat it.)

In the `refreshAccessToken()` method, find the same pattern for access token signing and apply the same change.

> **Do NOT change** the refresh token signing — it correctly uses a different secret:
> ```ts
> jwtService.sign(payload, { secret: appConfig.jwt.refreshSecret, expiresIn: appConfig.jwt.refreshExpiration })
> ```

✅ Run: `bun run test -- auth.service` — must pass (20 tests). Then `bun run lint`.

---

## Step 7 — Update `src/user/user.service.ts`

### 7a — Replace the `mapUserAcl` method

**Find and remove** the private method (around lines 65–82):
```ts
private mapUserAcl(user: UserWithAclRelations): UserWithAcl {
  const roles = user.roles.map((ur) => ur.role.name);
  const rolePermissions = user.roles.flatMap(
    (ur) => ur.role.permissions?.map((rp) => rp.permission.name) || [],
  );
  const directPermissions =
    user.permissions?.map((up) => up.permission.name) || [];
  const permissions = [...new Set([...rolePermissions, ...directPermissions])];
  return { ...user, roles, permissions };
}
```

**Update imports** at the top:
```ts
// Remove this entire import line:
import { UserWithAcl, UserWithAclRelations } from '../auth/interfaces/auth.interface';

// Add these instead:
import { UserWithAcl, UserWithAclRelations } from '../common/types/user.types';
import { mapUserAcl } from '../common/acl/acl.util';
```

All calls to `this.mapUserAcl(user)` become `mapUserAcl(user)`.

✅ Run: `bun run test -- user.service` — must pass. Then `bun run lint`.

---

## Step 8 — Make guard registration explicit

### 8a — Update `src/auth/auth.module.ts`

In the `@Module` decorator, find the `exports` array:
```ts
exports: [AuthService, AuthRepository],
```
Replace with:
```ts
exports: [AuthService, AuthRepository, JwtAuthGuard, AclGuard],
```

Also add the imports at the top of the file if not already present:
```ts
import { JwtAuthGuard } from './guards/jwt-auth-guard';
import { AclGuard } from './guards/acl.guard';
```

### 8b — Update `src/user/user.module.ts`

In the `@Module` imports array, add `AuthModule`:
```ts
// Before:
imports: [PrismaModule, LoggerModule, CacheModule, StorageModule],

// After:
imports: [PrismaModule, LoggerModule, CacheModule, StorageModule, AuthModule],
```

Add the import at the top of the file:
```ts
import { AuthModule } from '../auth/auth.module';
```

### 8c — Update `src/post/post.module.ts`

Same as 8b — add `AuthModule` to imports and add the import line.

✅ Run: `bun run lint` — must pass.

---

## Step 9 — Run all tests

```bash
bun run test
```

All existing tests must pass. Do not fix business logic — only fix import paths if any test breaks due to the type moves.

```bash
bun run test:e2e
```

The following endpoints must still work exactly as before:
- `POST /auth/register` → 201 with user data (no password field)
- `POST /auth/login` → 200 with `accessToken` + sets `refreshToken` cookie
- `POST /auth/refresh` → 200 with new `accessToken` (valid cookie); 401 (no/invalid cookie)
- `POST /auth/logout` → 200 success message
- `GET /users` → 401 without token; 200 with valid admin token

---

## Step 10 — Final lint and cleanup

```bash
bun run lint
bun run format
```

Check: no file inside `src/user/` should import from `../auth/interfaces/auth.interface` anymore.
Check: no file inside `src/post/` should import from `../auth/interfaces/auth.interface` for `UserWithAcl` or `UserWithAclRelations`.

---

## Files Created (2 new files)

| File | What it contains |
|---|---|
| `src/common/types/user.types.ts` | `UserWithAclRelations`, `UserWithAcl` |
| `src/common/acl/acl.util.ts` | `userAclInclude`, `mapUserAcl()` |

## Files Modified (8 files)

| File | What changed |
|---|---|
| `src/auth/interfaces/auth.interface.ts` | Removed `UserWithAclRelations`, `UserWithAcl`, `UserListResponseDto`; re-exports `UserWithAcl` from common |
| `src/auth/auth.repository.ts` | Import from common; remove private `userAclInclude`; use module-level constant |
| `src/auth/auth.service.ts` | Import from common; remove private `mapUserAcl`; simplify access token signing |
| `src/auth/auth.module.ts` | Export `JwtAuthGuard` and `AclGuard` |
| `src/user/user.repository.ts` | Import from common; remove private `userAclInclude`; use module-level constant |
| `src/user/user.service.ts` | Import from common; remove private `mapUserAcl` |
| `src/user/user.module.ts` | Import `AuthModule` |
| `src/post/post.module.ts` | Import `AuthModule` |
