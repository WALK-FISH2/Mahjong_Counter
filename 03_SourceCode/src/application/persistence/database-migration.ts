export type MigrationOutcome = Readonly<{
  version: number;
  writable: boolean;
  reason: string | null;
  backupId: string | null;
}>;
export interface DatabaseMigrationPort {
  migrate(target: number): Promise<MigrationOutcome>;
}
export function createDatabaseMigrationService(port: DatabaseMigrationPort, target: number) {
  return { run: () => port.migrate(target) };
}
