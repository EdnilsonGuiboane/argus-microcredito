 import { motion } from 'framer-motion';
 import { Construction } from 'lucide-react';
 
 export default function ComingSoon({ title }: { title: string }) {
   return (
     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[60vh] text-center">
       <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
         <Construction className="w-8 h-8 text-primary" />
       </div>
       <h1 className="text-2xl font-bold mb-2">{title}</h1>
       <p className="text-muted-foreground">Esta funcionalidade está em desenvolvimento.</p>
     </motion.div>
   );
 }