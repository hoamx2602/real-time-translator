# Supabase Migrations

Run these migrations in order in the Supabase SQL Editor.


## Migrations

| File | Description |
|------|-------------|
| `001_create_recordings_table.sql` | Create recordings table with RLS policies |
| `002_add_audio_storage.sql` | Add audio_url column and setup storage bucket |
| `003_add_summary_column.sql` | Add summary column for AI-generated summaries |

## How to Run

1. Go to Supabase Dashboard
2. Open **SQL Editor**
3. Run each migration file **in order** (001, 002, ...)
4. Verify each migration completes successfully before running the next

## Fresh Setup

If setting up a new database, run all migrations in order:

```
001_create_recordings_table.sql
002_add_audio_storage.sql
003_add_summary_column.sql
```

## Existing Database

If you already have a database:
- Check which migrations have been run
- Only run migrations that haven't been applied yet
