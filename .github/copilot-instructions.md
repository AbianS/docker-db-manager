# Docker DB Manager - AI Agent Instructions

## Project Overview
A Tauri v2 desktop app for managing Docker database containers (PostgreSQL, MySQL, Redis, MongoDB). Built with React + TypeScript frontend and Rust backend, using a multi-window architecture and a **provider-based system** for database-specific logic.

## Architecture

### Multi-Window System
The app uses **separate HTML entry points** for different windows:
- `index.html` → MainPage (container list)
- `create-container.html` → CreateContainerPage (wizard)
- `edit-container.html` → EditContainerPage (edit existing)

Windows communicate via Tauri events (`container-created`, `container-updated`) rather than shared state. See `src-tauri/src/commands/window.rs` for window management.

### Frontend-Backend Bridge
- **Typed wrapper**: All Tauri commands go through `src/core/tauri/invoke.ts` for centralized error handling
- **Command pattern**: Rust commands in `src-tauri/src/commands/` are invoked by name string from TypeScript
- **State management**: `useApp()` orchestrates database list + Docker status; hooks are split by responsibility (see `src/features/databases/`)
- **Provider system**: Database-specific logic (PostgreSQL, MySQL, Redis, MongoDB) abstracted into providers (`src/features/databases/providers/`)

### Data Flow
1. **Storage**: `tauri-plugin-store` persists databases to `databases.json` (key-value store)
2. **Synchronization**: Auto-sync every 5s via `useDatabaseList` to reconcile with actual Docker state
3. **Docker commands**: Generic command system using `DockerRunRequest` → `DockerRunArgs` → Docker CLI
4. **Provider pattern**: Frontend providers call `buildDockerArgs()` → Backend `build_docker_command_from_args()` → Docker
5. **Error handling**: Rust returns JSON-encoded errors; TypeScript parses via `core/errors/error-handler.ts`

## Critical Patterns

### Database Lifecycle
When updating databases (port/name changes):
1. Container is **recreated** (removed and re-run with new config)
2. Volume migration happens if `persist_data=true` and name changed
3. Always cleanup volumes on errors
4. Uses generic `create_container_from_docker_args` and `update_container_from_docker_args` commands

### Database-Specific Configuration
Each DB type has unique configuration managed by providers in `src/features/databases/providers/`:
- **PostgreSQL**: Port 5432, data path `/var/lib/postgresql/data`, env vars (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB)
- **MySQL**: Port 3306, data path `/var/lib/mysql`, env vars (MYSQL_ROOT_PASSWORD, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD)
- **Redis**: Port 6379, data path `/data`, command args for auth (--requirepass) and persistence (--appendonly)
- **MongoDB**: Port 27017, data path `/data/db`, env vars (MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD, MONGO_INITDB_DATABASE)

Providers implement:
- `buildDockerArgs(config)`: Converts form data to `DockerRunRequest`
- `validateConfig(config)`: Validates database-specific configuration
- `buildConnectionString(container)`: Generates connection strings

### Form Validation
Multi-step wizard uses `react-hook-form` (no Zod):
- Provider-based validation via `provider.validateConfig()`
- Step validation via `isCurrentStepValid` in wizard hook
- Form state persists across steps (single form instance)
- Dynamic form fields generated from provider configuration

## Development Commands

```bash
# Development (starts both Vite + Tauri)
npm run dev

# Linting (uses Biome, not ESLint)
npm run lint        # check only
npm run lint:fix    # auto-fix

# Testing
npm test           # watch mode
npm run test:run   # CI mode
npm run test:ui    # Vitest UI

# Rust tests
cd src-tauri && cargo test
```

### Build System
- **Vite**: Multi-entry build in `vite.config.ts` (rollupOptions.input)
- **Alias**: `@/` maps to `src/` in both Vite and tsconfig
- **Tauri dev**: Runs on port 1420 (strict port enforcement)

## Code Conventions

### File Naming
- **Enforced**: `kebab-case` for all files (Biome rule `useFilenamingConvention`)
- Hooks: `use-*.ts` (e.g., `use-container-list.ts`)
- Components: `PascalCase.tsx` (e.g., `MainPage.tsx`)

### Hook Composition
- **Separation of concerns**: Split hooks by responsibility
  - `use-database-list.ts`: State + sync
  - `use-database-actions.ts`: CRUD operations
  - `use-app.ts`: Orchestration layer
- Avoid monolithic hooks; prefer composition

### Error Handling
```typescript
// Frontend: Always use error handler
import { handleContainerError } from '@/core/errors/error-handler';
try {
  await databasesApi.createFromDockerArgs(request);
} catch (error) {
  handleContainerError(error); // Parses JSON errors, shows toast
}

// Backend: Return Result<T, String> with JSON error structs
return Err(serde_json::to_string(&CreateContainerError {
    error_type: "PORT_IN_USE".to_string(),
    message: format!("Port {} is already in use", port),
    details: Some("Change the port...".to_string()),
}).unwrap());
```

## Testing Strategy

### Frontend
- **Vitest** with jsdom environment (`src/test/setup.ts`)
- Test files: `**/*.{test,spec}.{ts,tsx}` (not in `src-tauri/`)
- Coverage excludes: `src/test/`, `*.config.*`, type definitions

### Backend
- Unit tests: `src-tauri/tests/unit_tests.rs`
  - `unit/docker_service_test.rs`: Tests for DockerService methods
  - `unit/generic_commands_test.rs`: Tests for generic command structures
- Integration tests: `src-tauri/tests/integration_tests.rs`
  - `integration/postgresql_integration_test.rs`: PostgreSQL with real Docker
  - `integration/mysql_integration_test.rs`: MySQL with real Docker
  - `integration/redis_integration_test.rs`: Redis with real Docker
  - `integration/mongodb_integration_test.rs`: MongoDB with real Docker
  - `integration/utils.rs`: Shared test utilities
- Tests verify real container creation, updates, volumes, and port changes

## Common Gotchas

1. **Window events**: Main window needs listeners for `container-created`/`container-updated` to refresh list
2. **Volume naming**: Always `{container-name}-data` format; handle renames carefully
3. **Docker status overlay**: Shown when Docker is unavailable; check `useDockerStatus` hook
4. **Rust mutex locks**: Always clone before async operations to avoid holding locks across await points
5. **Port validation**: Check both Docker availability AND port conflicts before creation
6. **Provider system**: Always use provider methods (`buildDockerArgs`, `validateConfig`) instead of hardcoding database logic

## Dependencies Notes

- **Biome**: Used instead of ESLint/Prettier (single config in `biome.json`)
- **Shadcn/ui**: Components in `src/shared/components/ui/` (Radix UI + Tailwind)
- **Framer Motion**: Animations in wizard steps (see `pageVariants` in `DatabaseSelectionForm`)
- **tauri-plugin-store**: Key-value persistence (NOT a database)

## Adding New Database Types

1. Add type to `DatabaseType` in `src/shared/types/container.ts`
2. Create new provider in `src/features/databases/providers/` implementing:
   - `buildDockerArgs()`: Build Docker command arguments
   - `validateConfig()`: Validate database-specific configuration
   - `buildConnectionString()`: Generate connection string
   - Configuration fields (sections, authFields, advancedFields)
3. Register provider in `src/features/databases/providers/index.ts`
4. Add default image and version in provider configuration

## When in Doubt

- **Type mismatches**: Check both Rust types (`src-tauri/src/types/`) and TypeScript types (`src/shared/types/`)
- **Docker issues**: Run `docker version` and `docker info` commands used by `check_docker_status`
- **State sync**: Containers auto-sync every 5s; force reload with `loadContainers()`
- **Provider issues**: Check provider implementation in `src/features/databases/providers/` for database-specific logic
