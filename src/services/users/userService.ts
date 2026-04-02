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

export type UserListItem = User & {
  roles: UserRole[];
};

function mapUserFromDb(row: UserRow): User {
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

export class UserService {
  async list(): Promise<UserListItem[]> {
    const [{ data: usersData, error: usersError }, { data: rolesData, error: rolesError }] =
      await Promise.all([
        supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('user_role_assignments')
          .select('*'),
      ]);

    if (usersError) {
      throw new Error(usersError.message);
    }

    if (rolesError) {
      throw new Error(rolesError.message);
    }

    const rolesByUser = new Map<string, UserRole[]>();

    ((rolesData as UserRoleAssignmentRow[] | null) ?? []).forEach((row) => {
      const current = rolesByUser.get(row.user_id) ?? [];
      current.push(row.role);
      rolesByUser.set(row.user_id, current);
    });

    return ((usersData as UserRow[] | null) ?? []).map((row) => ({
      ...mapUserFromDb(row),
      roles: rolesByUser.get(row.id) ?? [],
    }));
  }

  async getById(id: string): Promise<UserListItem | null> {
    const [{ data: userRow, error: userError }, { data: rolesData, error: rolesError }] =
      await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('user_role_assignments')
          .select('*')
          .eq('user_id', id),
      ]);

    if (userError) {
      throw new Error(userError.message);
    }

    if (rolesError) {
      throw new Error(rolesError.message);
    }

    if (!userRow) return null;

    return {
      ...mapUserFromDb(userRow as UserRow),
      roles: ((rolesData as UserRoleAssignmentRow[] | null) ?? []).map(
        (r) => r.role
      ),
    };
  }

  async updateProfile(
    id: string,
    payload: {
      full_name?: string;
      email?: string;
      phone?: string | null;
      is_active?: boolean;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async setPrimaryRole(
    userId: string,
    tenantId: string,
    role: UserRole
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from('user_role_assignments')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const { error: insertError } = await supabase
      .from('user_role_assignments')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        role,
      });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }
  
  async deleteViaAdminFunction(userId: string): Promise<void> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
        headers: session?.access_token
        ? {
            Authorization: `Bearer ${session.access_token}`,
            }
        : undefined,
    });

    console.log('EDGE DELETE USER RESPONSE:', { data, error });

    if (error) {
        throw new Error(error.message || 'Não foi possível apagar o utilizador.');
    }

    if ((data as any)?.error) {
        throw new Error((data as any).error);
        }
    }

  async createViaAdminFunction(payload: {
    tenantId: string;
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    role: UserRole;
    createdBy?: string;
    }): Promise<void> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: payload,
        headers: session?.access_token
        ? {
            Authorization: `Bearer ${session.access_token}`,
            }
        : undefined,
    });

    console.log('EDGE FUNCTION RESPONSE:', { data, error });

    if (error) {
        throw new Error(error.message || 'Não foi possível criar o utilizador.');
    }

    if ((data as any)?.error) {
        throw new Error((data as any).error);
        }
    }
}

export const userService = new UserService();