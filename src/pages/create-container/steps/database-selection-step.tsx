import { motion } from 'framer-motion';
import { Controller, UseFormReturn } from 'react-hook-form';
import { databaseRegistry } from '@/features/databases/registry/database-registry';
import { cn } from '../../../shared/utils/cn';
import type { CreateDatabaseFormData } from '../hooks/use-container-creation-wizard';

interface Props {
  form: UseFormReturn<CreateDatabaseFormData>;
  isSubmitting: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
};

const buttonVariants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

export function DatabaseSelectionStep({ form, isSubmitting }: Props) {
  const {
    formState: { errors },
    control,
  } = form;

  const providers = databaseRegistry.getAll();

  return (
    <div className="max-h-[70vh] overflow-y-auto px-2">
      <motion.div
        className="space-y-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Controller
          name="databaseSelection.dbType"
          control={control}
          render={({ field: { onChange, value } }) => (
            <motion.div className="space-y-4" variants={itemVariants}>
              <div className="text-sm font-medium text-foreground text-center">
                Select database type
              </div>{' '}
              <motion.div
                className="grid grid-cols-3 gap-3"
                variants={containerVariants}
              >
              {providers.map((provider, index) => (
                <motion.div
                  key={provider.id}
                  variants={buttonVariants}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  custom={index}
                >
                  <motion.button
                    type="button"
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all duration-200 ease-out border-white/10 bg-white/10 hover:border-primary hover:shadow-lg hover:opacity-90 group w-full',
                      {
                        'border-primary bg-primary/20': value === provider.id,
                      },
                    )}
                    onClick={() => onChange(provider.id)}
                    disabled={isSubmitting}
                    variants={itemVariants}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <motion.div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-200 ease-out',
                          'group-hover:scale-110',
                          'group-active:scale-90',
                        )}
                        style={{ backgroundColor: provider.color }}
                        animate={{
                          rotate: value === provider.id ? [0, -5, 5, -5, 0] : 0,
                        }}
                        transition={{
                          duration: 0.5,
                          ease: 'easeInOut',
                        }}
                      >
                        {provider.icon}
                      </motion.div>
                      <span className="font-medium text-foreground text-sm">
                        {provider.name}
                      </span>
                    </div>
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
            {/* Error message */}
            {errors.databaseSelection?.dbType && (
              <motion.div
                className="flex items-center justify-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-1 rounded border border-destructive/20">
                  {errors.databaseSelection.dbType.message}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      />
      </motion.div>
    </div>
  );
}
