import { supabase } from '@/lib/supabase'

export type NotificationType =
  | 'reminder'
  | 'late_alert'
  | 'system'
  | 'daily_summary'

export type NotificationPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'

export interface AppNotification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  icon?: string
  read: boolean
  actionPath?: string
  createdAt: string
  expiresAt?: string
}

class NotificationService {
  private mapFromDb(row: any): AppNotification {
    return {
      id: row.id,
      type: row.type,
      priority: row.priority,
      title: row.title,
      message: row.message,
      icon: row.icon ?? undefined,
      read: row.read,
      actionPath: row.action_path ?? undefined,
      createdAt: row.created_at,
      expiresAt: row.expires_at ?? undefined,
    }
  }

  async getAll(): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Erro ao buscar notificações:', error.message)
      return []
    }

    return (data ?? []).map(row => this.mapFromDb(row))
  }

  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)

    if (error) {
      console.error('Erro ao contar notificações:', error.message)
      return 0
    }

    return count ?? 0
  }

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Erro ao marcar notificação como lida:', error.message)
    }
  }

  async markAllAsRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('read', false)

    if (error) {
      console.error('Erro ao marcar todas como lidas:', error.message)
    }
  }

  async dismiss(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao remover notificação:', error.message)
    }
  }

  async clearAll(): Promise<void> {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if (!userId) return

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Erro ao limpar notificações:', error.message)
    }
  }

  async refreshNotifications(): Promise<void> {
    return
  }

  subscribe(onChange: () => void) {
    return supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        onChange
      )
      .subscribe()
  }
}

export const notificationService = new NotificationService()