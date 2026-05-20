# Windows Demo Package

This repo can now produce a Windows demo package that installs the IMS app for a local customer demo.

## What The Package Includes

- built frontend assets from `frontend/dist`
- backend source under `src/`
- runtime dependencies under `node_modules/`
- a bundled `node.exe` runtime copied from the build machine
- database schema and seed SQL
- Windows install/start/stop/database-init scripts

## Important Constraint

The package is not a fully self-contained desktop app. It still requires PostgreSQL because the backend uses `pg` and expects a PostgreSQL database.

For the smoothest demo machine setup:

1. Install PostgreSQL locally.
2. Ensure `psql.exe` is available in `PATH`, or install PostgreSQL in a standard path such as `C:\Program Files\PostgreSQL\18\bin`.
3. Adjust the packaged `.env` if the local PostgreSQL credentials differ from the demo default.

Default packaged database connection:

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/ims_demo
```

## Build The Package

From the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-demo-package.ps1
```

Output:

- unpacked folder: `dist/ims-demo-windows-v<version>/`
- zip archive: `dist/ims-demo-windows-v<version>.zip`

## Install On A Demo PC

1. Copy the zip to the customer PC.
2. Extract it.
3. For the fastest handoff, you can run `Run-IMS-Demo.bat` directly from the extracted package.
4. For a normal install with desktop shortcuts, run `Install-IMS-Demo.ps1`.
5. If needed, edit the installed `.env` file to match local PostgreSQL credentials.
6. Launch the app with `Run-IMS-Demo.bat`, `Start-IMS-Demo.bat`, or the desktop shortcut created by the installer.

The app will run at:

```text
http://localhost:3000
```

## Database Initialization

The installer and start script both call:

```powershell
scripts\Initialize-IMS-Demo-Database.ps1
```

That script will:

- verify PostgreSQL connectivity through `psql`
- create the demo database if it does not exist
- apply `database/schema/001_ims_mvp.sql`
- apply `database/seeds/001_baseline_roles_and_users.sql`

The schema and seed are written to be rerunnable, so repeated initialization is acceptable for demo refreshes.
