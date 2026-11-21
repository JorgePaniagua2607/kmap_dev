import { motion } from 'framer-motion';

export default function Page({ title, crumb, actions, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-blue-200">{crumb}</div>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {actions}
      </div>
      {children}
    </motion.div>
  );
}
