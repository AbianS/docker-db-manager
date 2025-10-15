import { motion } from 'framer-motion';
import { UseFormReturn } from 'react-hook-form';
import { databaseRegistry } from '@/features/databases/registry/database-registry';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { CodeBlock } from '../../../shared/components/ui/code-block';
import { CreateDatabaseFormData } from '../hooks/use-container-creation-wizard';

interface Props {
  form: UseFormReturn<CreateDatabaseFormData>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
      staggerChildren: 0.1,
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

/**
 * Generate Docker command preview from form data using provider
 */
function generateDockerCommand(formData: CreateDatabaseFormData): string {
  const { databaseSelection, containerConfiguration } = formData;
  const { dbType } = databaseSelection;

  if (!dbType) {
    return '# Please select a database type first';
  }

  // Get the provider for this database type
  const provider = databaseRegistry.get(dbType);
  if (!provider) {
    return `# Error: No provider found for ${dbType}`;
  }

  // Let the provider build the Docker arguments
  const dockerArgs = provider.buildDockerArgs(containerConfiguration);
  const { name } = containerConfiguration;

  // Format the command nicely for display
  const lines: string[] = ['docker run -d \\'];

  // Container name
  lines.push(`  --name ${name} \\`);

  // Port mappings
  if (dockerArgs.ports && dockerArgs.ports.length > 0) {
    for (const port of dockerArgs.ports) {
      lines.push(`  -p ${port.host}:${port.container} \\`);
    }
  }

  // Environment variables
  if (dockerArgs.envVars && Object.keys(dockerArgs.envVars).length > 0) {
    for (const [key, value] of Object.entries(dockerArgs.envVars)) {
      lines.push(`  -e ${key}=${value} \\`);
    }
  }

  // Volumes
  if (dockerArgs.volumes && dockerArgs.volumes.length > 0) {
    for (const volume of dockerArgs.volumes) {
      lines.push(`  -v ${volume.name}:${volume.path} \\`);
    }
  }

  // Image with tag
  lines.push(`  ${dockerArgs.image}`);

  // Command arguments (if any)
  if (dockerArgs.command && dockerArgs.command.length > 0) {
    lines[lines.length - 1] += ` ${dockerArgs.command.join(' ')}`;
  }

  return lines.join('\n');
}

export function ReviewStep({ form }: Props) {
  const formData = form.watch();
  const dockerCommand = generateDockerCommand(formData);

  return (
    <motion.div
      className="space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <div className="text-sm font-medium text-foreground text-center mb-4">
          Docker command that will be executed
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardContent>
            <CodeBlock
              language="bash"
              filename="docker-command.sh"
              code={dockerCommand}
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
