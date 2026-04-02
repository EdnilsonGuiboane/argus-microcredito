// src/services/auth/authService.ts
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/models/types';

type UserRow = {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

type UserRoleAssignmentRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: UserRole;
  granted_by: string | null;
  granted_at: string;
};

type UserBase = Omit<User, 'role'>;

function mapUserFromDb(row: UserRow): UserBase {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getPrimaryRole(roles: UserRole[]): UserRole {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('analyst')) return 'analyst';
  if (roles.includes('cashier')) return 'cashier';
  return 'cashier';
}

export class AuthService {
  async loginWithRoles(
    email: string,
    password: string
  ): Promise<{ user: User; roles: UserRole[] }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const authUser = data.user;
    if (!authUser) {
      throw new Error('Utilizador não encontrado.');
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (userError) {
      throw new Error(userError.message);
    }

    const userBase = mapUserFromDb(userRow);

    if (!userBase.isActive) {
      throw new Error('Este utilizador está desactivado.');
    }

    const { data: roleRows, error: roleError } = await supabase
      .from('user_role_assignments')
      .select('*')
      .eq('user_id', userBase.id);

    if (roleError) {
      throw new Error(roleError.message);
    }

    const roles = (roleRows ?? []).map(
      (row: UserRoleAssignmentRow) => row.role
    );

    const user: User = {
      ...userBase,
      role: getPrimaryRole(roles),
    };

    const { error: updateError } = await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Erro ao actualizar último login:', updateError);
    }

    return { user, roles };
  }

  async getCurrentUserWithRoles(): Promise<{ user: User; roles: UserRole[] } | null> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!session?.user) {
      return null;
    }

    const authUser = session.user;

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (userError) {
      throw new Error(userError.message);
    }

    if (!userRow) {
      return null;
    }

    const userBase = mapUserFromDb(userRow);

    if (!userBase.isActive) {
      return null;
    }

    const { data: roleRows, error: roleError } = await supabase
      .from('user_role_assignments')
      .select('*')
      .eq('user_id', userBase.id);

    if (roleError) {
      throw new Error(roleError.message);
    }

    const roles = (roleRows ?? []).map(
      (row: UserRoleAssignmentRow) => row.role
    );

    const user: User = {
      ...userBase,
      role: getPrimaryRole(roles),
    };

    return { user, roles };
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }
}

export const authService = new AuthService();