import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  notificationService,
  AppNotification,
  NotificationType,
} from '@/services/notificationService'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const SOUND_PREF_KEY = 'microcredito_sound_alerts'

function getSoundEnabled(): boolean {
  return localStorage.getItem(SOUND_PREF_KEY) !== 'false'
}

function playCriticalAlert() {
  try {
    const ctx = new AudioContext()

    ;[880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.value = 0.15

      osc.connect(gain).connect(ctx.destination)

      const start = ctx.currentTime + i * 0.18
      osc.start(start)
      osc.stop(start + 0.14)
    })
  } catch {
    // silent fallback
  }
}

const TYPE_LABELS: Record<NotificationType, string> = {
  reminder: 'Lembrete',
  late_alert: 'Atraso',
  system: 'Sistema',
  daily_summary: 'Resumo',
}

const TYPE_BADGE_VARIANT: Record<NotificationType, string> = {
  late_alert: 'bg-destructive/10 text-destructive border-destructive/20',
  reminder: 'bg-primary/10 text-primary border-primary/20',
  system: 'bg-accent/50 text-accent-foreground border-accent/20',
  daily_summary: 'bg-muted text-muted-foreground border-border',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeFilter, setActiveFilter] = useState<NotificationType | 'all'>(
    'all'
  )
  const [soundEnabled, setSoundEnabled] = useState(getSoundEnabled)

  const prevCriticalRef = useRef<number>(0)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const refresh = useCallback(async () => {
    await notificationService.refreshNotifications()

    const all = await notificationService.getAll()
    const count = await notificationService.getUnreadCount()

    setNotifications(all)
    setUnreadCount(count)

    const criticalCount = all.filter(
      n => !n.read && n.priority === 'critical'
    ).length

    if (
      soundEnabled &&
      criticalCount > prevCriticalRef.current &&
      prevCriticalRef.current >= 0
    ) {
      playCriticalAlert()
    }

    prevCriticalRef.current = criticalCount
  }, [soundEnabled])

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem(SOUND_PREF_KEY, String(next))
  }

  useEffect(() => {
    refresh()

    const channel = notificationService.subscribe(() => {
      refresh()
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    if (open) document.addEventListener('mousedown', handler)

    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = async (notif: AppNotification) => {
    await notificationService.markAsRead(notif.id)
    await refresh()

    if (notif.actionPath) {
      navigate(notif.actionPath)
      setOpen(false)
    }
  }

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead()
    await refresh()
  }

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await notificationService.dismiss(id)
    await refresh()
  }

  const handleClearAll = async () => {
    await notificationService.clearAll()
    await refresh()
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()

    if (diff < 60_000) return 'agora'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`

    return d.toLocaleDateString('pt-MZ', {
      day: '2-digit',
      month: 'short',
    })
  }

  const filtered =
    activeFilter === 'all'
      ? notifications
      : notifications.filter(n => n.type === activeFilter)

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground relative"
        onClick={() => setOpen(prev => !prev)}
      >
        <Bell className="w-5 h-5" />

        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[380px] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Notificações</h3>

                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={toggleSound}
                  title={soundEnabled ? 'Desativar som' : 'Ativar som'}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Button>

                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleMarkAllRead}
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    Ler tudo
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setOpen(false)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
              {(
                [
                  ['all', 'Todas'],
                  ['reminder', 'Lembretes'],
                  ['late_alert', 'Atrasos'],
                  ['system', 'Sistema'],
                  ['daily_summary', 'Resumo'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-full border font-medium whitespace-nowrap transition-colors',
                    activeFilter === key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <ScrollArea className="max-h-[360px]">
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Sem notificações
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.slice(0, 30).map(notif => (
                    <button
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 group',
                        !notif.read && 'bg-primary/5'
                      )}
                    >
                      <div className="text-lg flex-shrink-0 mt-0.5">
                        {notif.icon || '🔔'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full border font-medium',
                              TYPE_BADGE_VARIANT[notif.type]
                            )}
                          >
                            {TYPE_LABELS[notif.type]}
                          </span>

                          <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                            {formatTime(notif.createdAt)}
                          </span>
                        </div>

                        <p
                          className={cn(
                            'text-sm truncate',
                            !notif.read ? 'font-semibold' : 'font-medium'
                          )}
                        >
                          {notif.title}
                        </p>

                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        )}

                        <button
                          onClick={e => handleDismiss(e, notif.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                        >
                          <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {notifications.length > 0 && (
              <div className="border-t border-border px-4 py-2 bg-muted/30 flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive"
                  onClick={handleClearAll}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Limpar tudo
                </Button>

                <span className="text-[10px] text-muted-foreground self-center">
                  {notifications.length} notificação(ões)
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}