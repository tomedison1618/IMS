# IMS Demo Install Instructions

This guide is for installing the IMS demo on a customer Windows PC.

## What You Need

- Windows PC
- PostgreSQL installed locally
- `psql.exe` available in `PATH`, or installed in a standard PostgreSQL folder
- the IMS demo package zip, such as `ims-demo-windows-v0.1.0.zip`

The IMS package already includes:

- the backend
- the built frontend
- required Node runtime
- app dependencies
- database schema and seed files

You do not need to install Node.js or npm on the customer PC.

## 1. Install PostgreSQL

Install PostgreSQL on the customer PC first.

Recommended defaults:

- host: `localhost`
- port: `5432`
- database user: `postgres`

Make sure the PostgreSQL installation includes `psql`.

## 2. Extract The IMS Demo Package

1. Copy the IMS demo zip to the customer PC.
2. Extract it to a normal local folder.
3. Open the extracted folder.

You should see:

- `Install-IMS-Demo.ps1`
- `WINDOWS_DEMO_PACKAGE.md`
- an `app/` folder

## 3. Run The Installer

1. Right-click `Install-IMS-Demo.ps1`.
2. Run it with PowerShell.

The installer will:

- copy the app into the local user programs folder
- create the `.env` file if it does not exist
- try to create the demo database
- apply the database schema
- apply the demo seed data
- create desktop shortcuts unless disabled

Default install location:

```text
%LOCALAPPDATA%\Programs\IMS Demo
```

## 4. Check The Database Connection

After install, open the installed `.env` file if needed.

Default demo connection:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://postgres:password@localhost:5432/ims_demo
DB_SSL=false
JWT_SECRET=ims-demo-secret-change-me
```

If the customer PC uses a different PostgreSQL password, port, or username, update `DATABASE_URL` before starting the app.

## 5. Start The Demo

Use either:

- `Start-IMS-Demo.bat`
- the `IMS Demo` desktop shortcut created by the installer

The app opens at:

```text
http://localhost:3000
```

## 6. Demo Logins

Use these seeded demo accounts:

- `admin@ims.local` / `Admin123!`
- `cfo@ims.local` / `Finance123!`
- `ops.test@ims.local` / `Ops123!`

## 7. Stop The Demo

Use either:

- `Stop-IMS-Demo.bat`
- the `IMS Demo Stop` desktop shortcut

## Troubleshooting

### Installer says database initialization failed

Usually this means one of these:

- PostgreSQL is not running
- `psql` is not installed or not reachable
- the PostgreSQL username or password in `.env` is wrong
- port `5432` is different on that PC

Fix the `.env` file, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Initialize-IMS-Demo-Database.ps1 -EnvFilePath .\.env
```

Run that command from the installed app folder.

### The app does not open

Check:

- port `3000` is free
- PostgreSQL is running
- the installed `.env` is correct

If needed, start the app again with `Start-IMS-Demo.bat`.

### PowerShell blocks the scripts

Run the scripts with:

```powershell
powershell -ExecutionPolicy Bypass -File .\Install-IMS-Demo.ps1
```

## Demo Reset

To reset the demo database on the same PC, rerun:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Initialize-IMS-Demo-Database.ps1 -EnvFilePath .\.env
```

This is safe for refreshing the seeded demo environment.
