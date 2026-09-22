# Habbits v0.2

Vite + React + TypeScript.

## Data

The current schema is defined in `src/domain/dailyRecord.ts`. Browser storage is
handled by `src/storage/habbitsStorage.ts` under the versioned key
`habbits-data-v1`.

Existing data stored under `habbits-react-v2` is migrated automatically on the
first launch. The legacy value is left untouched as a rollback copy until the
user explicitly deletes all data.
