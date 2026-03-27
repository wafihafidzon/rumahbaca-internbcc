export const ROLES = {
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  USER: 'USER',
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];
