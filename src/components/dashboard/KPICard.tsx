 import { motion } from 'framer-motion';
 import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface KPICardProps {
   title: string;
   value: string;
   subtitle?: string;
   icon: LucideIcon;
   trend?: {
     value: number;
     isPositive: boolean;
   };
   variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'default';
   delay?: number;
 }
 
 export function KPICard({
   title,
   value,
   subtitle,
   icon: Icon,
   trend,
   variant = 'default',
   delay = 0,
 }: KPICardProps) {
   const variantStyles = {
     primary: 'kpi-card-primary',
     success: 'kpi-card-success',
     warning: 'kpi-card-warning',
     danger: 'kpi-card-danger',
     info: 'kpi-card-info',
     accent: 'kpi-card-accent',
     default: 'bg-card border border-border',
   };
 
   const isColored = variant !== 'default';
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.4, delay }}
       className={cn('kpi-card', variantStyles[variant])}
     >
       <div className="flex items-start justify-between">
         <div className="flex-1">
           <p className={cn(
             'text-sm font-medium mb-1',
             isColored ? 'opacity-80' : 'text-muted-foreground'
           )}>
             {title}
           </p>
           <p className={cn(
             'text-2xl font-bold mb-1',
             !isColored && 'text-foreground'
           )}>
             {value}
           </p>
           {subtitle && (
             <p className={cn(
               'text-xs',
               isColored ? 'opacity-70' : 'text-muted-foreground'
             )}>
               {subtitle}
             </p>
           )}
           {trend && (
             <div className={cn(
               'flex items-center gap-1 mt-2 text-xs font-medium',
               isColored ? 'opacity-90' : (trend.isPositive ? 'text-success' : 'text-destructive')
             )}>
               {trend.isPositive ? (
                 <TrendingUp className="w-3 h-3" />
               ) : (
                 <TrendingDown className="w-3 h-3" />
               )}
               <span>{trend.value}% vs mês anterior</span>
             </div>
           )}
         </div>
         <div className={cn(
           'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
           isColored ? 'bg-white/20' : 'bg-primary/10'
         )}>
           <Icon className={cn(
             'w-5 h-5',
             isColored ? '' : 'text-primary'
           )} />
         </div>
       </div>
     </motion.div>
   );
 }