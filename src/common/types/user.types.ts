import type { Role, User, UserRole } from '@prisma/client';

export type UserWithRolesRelations = User & {
  roles: (UserRole & {
    role: Role;
  })[];
};

export type UserWithRoles = User & {
  roles: string[];
};

export function mapUserRoles(user: UserWithRolesRelations): UserWithRoles {
  const roles = user.roles.map((userRole) => userRole.role.name);
  return { ...user, roles };
}
