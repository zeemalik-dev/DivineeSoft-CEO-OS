# Database Initialization Guide

This guide initializes an empty local PostgreSQL database with the Prisma schema and the seed data defined in `prisma/seed.ts`.

## Prerequisites

- PostgreSQL is installed and running.
- Node.js 20 or newer is installed.
- Dependencies are installed with `npm install`.
- The local database already exists, for example:

```bash
createdb divineesoft-hrm
```

If the database already exists, continue to the next step.

## 1. Configure `.env`

Use the local PostgreSQL database for both runtime queries and migrations:

```dotenv
DATABASE_URL="postgresql://postgres@localhost:5432/divineesoft-hrm?connect_timeout=10"
DIRECT_URL="postgresql://postgres@localhost:5432/divineesoft-hrm?connect_timeout=10"
```

Keep the other required application variables in `.env`, especially:

```dotenv
AUTH_SECRET="replace-with-a-long-random-secret"
CRON_SECRET="replace-with-a-long-random-secret"
SEED_DEFAULT_PASSWORD="replace-with-the-development-login-password"
```

Never commit `.env` or expose production credentials. Use a new password and rotate any credentials that have been shared publicly.

## 2. Confirm PostgreSQL and Prisma access

```bash
pg_isready -h localhost -p 5432
npx prisma validate
npx prisma migrate status
```

The database must be reachable, and the Prisma schema must validate before continuing.

## 3. Apply the Prisma model to an empty database

For a database managed by the repository migrations, run:

```bash
npx prisma migrate deploy
npx prisma generate
```

`migrate deploy` creates the tables, indexes, foreign keys, and the `Employee.phone` column from the migration files. Do not use `prisma db push` for a shared or production database because it bypasses migration history.

For local development when creating a brand-new migration from intentional schema changes, use:

```bash
npx prisma migrate dev --name describe_the_change
```

## 4. Run the seed script

The seed script creates or updates:

- The seven predefined users and their employee records
- Reporting relationships
- The predefined projects and project memberships
- Automation rules
- Starter tasks

Run it with:

```bash
npm run db:seed
```

The script is designed to be safe to run again. It uses upserts for users, projects, memberships, and automation rules, and avoids duplicating starter tasks with the same title.

The seeded accounts use the value of `SEED_DEFAULT_PASSWORD` in `.env`. The default fallback in code is intended only for development and should be replaced in `.env`.

## 5. Verify the initialized database

```bash
npx prisma migrate status
npx prisma studio
```

Expected seed counts for a clean local database are approximately:

- 7 users
- 7 employees
- 14 projects
- 3 automation rules
- 7 tasks, including the recurring daily update task

You can also verify counts directly:

```bash
psql -h localhost -p 5432 -U postgres -d divineesoft-hrm -c '
SELECT ''User'' AS table_name, count(*) FROM "User"
UNION ALL SELECT ''Employee'', count(*) FROM "Employee"
UNION ALL SELECT ''Project'', count(*) FROM "Project"
UNION ALL SELECT ''Task'', count(*) FROM "Task";
'
```

Start the application after initialization:

```bash
npm run dev
```

## Reinitialize a disposable local database

Only use this when the local database can be erased. This deletes all application data:

```bash
dropdb divineesoft-hrm
createdb divineesoft-hrm
npx prisma migrate deploy
npm run db:seed
```

Do not run these commands against production or a database containing data you need to preserve.

## Troubleshooting

### `Employee.phone` does not exist

Apply the migrations and restart the development server:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

The repository includes a migration named `20260916000000_add_employee_phone` for this column.

### `ActivityEvent` duplicate key errors

This usually happens after importing rows with explicit `ActivityEvent.id` values. Reset the local sequence to the largest existing ID:

```bash
psql -h localhost -p 5432 -U postgres -d divineesoft-hrm -c \
  'SELECT setval(pg_get_serial_sequence('"'"'public."ActivityEvent"'"'"', '"'"'id'"'"'), COALESCE((SELECT MAX(id) FROM public."ActivityEvent"), 1), true);'
```

### Prisma permission denied under `node_modules`

Do not run Prisma with `sudo`. If `sudo npx prisma studio` was used, generated files may be owned by `root`. Repair ownership once from the project root, then use normal commands:

```bash
sudo chown -R "$(whoami)":staff node_modules/.prisma node_modules/@prisma/client
npx prisma generate
```

### Seed fails because an employee is missing

Run the current `npm run db:seed` script. It repairs a missing employee record for an existing seeded user before creating projects and tasks.

## Normal update workflow

When the Prisma model changes:

```bash
npx prisma migrate dev --name describe_the_change
npx prisma generate
npm run db:seed
npx prisma migrate status
```

Commit the new migration directory and the corresponding schema changes. Do not commit `.env` or local database data.
