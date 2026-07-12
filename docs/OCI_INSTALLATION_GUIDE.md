# IMS Oracle Cloud Installation Guide

This guide covers a production-style install of IMS on Oracle Cloud Infrastructure using:

- one Ubuntu VM
- PostgreSQL on the same VM
- the IMS Node.js backend on port `3000`
- Nginx as a reverse proxy on port `80`

This is the simplest reliable deployment path for the current app.

## What You Need

- an OCI account
- permission to create networking and compute resources
- a public SSH key, or willingness to let OCI generate a key pair
- this IMS codebase available locally or in Git

## 1. Create The VCN

Create a VCN before creating the instance.

Recommended values:

- VCN name: `IMS`
- VCN CIDR: `10.0.0.0/16`

Important:

- do not use `0.0.0.0/0` as the VCN CIDR
- `0.0.0.0/0` is only for route rules and open-source ingress rules

## 2. Create The Public Subnet

Create one public subnet inside the VCN.

Recommended values:

- subnet name: `IMS`
- subnet CIDR: `10.0.0.0/24`

## 3. Create The Internet Gateway

Create an Internet Gateway in the same VCN.

Recommended name:

- `IMS`

## 4. Create The Route Table

Create or edit the route table used by the public subnet.

Add this route rule:

- destination: `0.0.0.0/0`
- target type: `Internet Gateway`
- target: your VCN Internet Gateway

If this route is wrong, the VM will get a public IP but still not be reachable from the internet.

## 5. Configure The Security List

On the subnet security list, add these ingress rules:

- `TCP 22` from `0.0.0.0/0`
- `TCP 80` from `0.0.0.0/0`
- `TCP 443` from `0.0.0.0/0`

Optional for direct debugging only:

- `TCP 3000` from `0.0.0.0/0`

Leave the default allow-all egress rule in place.

## 6. Create The Ubuntu Instance

Create the VM in the public subnet.

Recommended values:

- image: Ubuntu
- subnet: the public subnet above
- public IPv4: enabled

For SSH keys, either:

- upload your own `.pub` file
- or choose `Generate a key pair for me`

If OCI generates the key pair:

- download the private key immediately
- store it safely
- OCI will not show it again

## 7. Connect Over SSH

For Ubuntu images, the username is `ubuntu`.

Example PowerShell command:

```powershell
ssh -i "C:\path\to\your-private-key.key" ubuntu@YOUR_PUBLIC_IP
```

Common Windows issues:

- if the key path contains spaces, wrap it in quotes
- if SSH says the private key is too open, fix the key file ACL

Example ACL fix:

```powershell
$key = "C:\path\to\your-private-key.key"
icacls $key /inheritance:r
icacls $key /remove "Users" "Authenticated Users" "Everyone" "CodexSandboxUsers"
icacls $key /grant:r "${env:USERNAME}:R"
```

## 8. Install Base Packages

Run on the VM:

```bash
sudo apt update
sudo apt install -y git curl nginx postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node -v
npm -v
psql --version
```

## 9. Copy The App To The VM

If using Git:

```bash
cd ~
git clone YOUR_REPO_URL ims
cd ~/ims
```

If copying from a Windows machine:

```powershell
scp -i "C:\path\to\key.key" -r "D:\apps\IMS\V0.1.1" ubuntu@YOUR_PUBLIC_IP:~/ims
```

Then on the VM:

```bash
cd ~/ims
```

## 10. Create The Database

Open PostgreSQL:

```bash
sudo -u postgres psql
```

Create the role and database:

```sql
CREATE ROLE ims_app WITH LOGIN PASSWORD 'ChangeThisStrongPassword123!';
CREATE DATABASE ims OWNER ims_app;
\q
```

## 11. Create The `.env` File

From `~/ims`:

```bash
cat > .env <<'EOF'
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
DATABASE_URL=postgresql://ims_app:ChangeThisStrongPassword123!@localhost:5432/ims
DB_SSL=false
JWT_SECRET=replace-this-with-a-long-random-secret
EOF
```

If the database password contains `!`, wrap Bash connection strings in single quotes when using `psql`.

## 12. Install Dependencies

```bash
npm ci
npm --prefix frontend ci
```

## 13. Load Schema And Seed Data

```bash
psql 'postgresql://ims_app:ChangeThisStrongPassword123!@localhost:5432/ims' -f database/schema/001_ims_mvp.sql
psql 'postgresql://ims_app:ChangeThisStrongPassword123!@localhost:5432/ims' -f database/seeds/001_baseline_roles_and_users.sql
```

## 14. Build The Frontend

```bash
npm run build:web
```

This creates `frontend/dist`, which the backend serves in production.

## 15. Start And Test The App Locally

Start the app:

```bash
npm start
```

In a second SSH session, test:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/
ss -ltnp | grep 3000
```

Expected:

- health returns `{"status":"ok"}`
- the app HTML loads
- the listener shows `0.0.0.0:3000`

## 16. Configure Nginx

Create the site config:

```bash
sudo tee /etc/nginx/sites-available/ims > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/ims /etc/nginx/sites-enabled/ims
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl restart nginx
sudo systemctl status nginx --no-pager
```

Test locally:

```bash
curl http://127.0.0.1/
```

If that returns HTML, Nginx is proxying correctly.

## 17. Check The Ubuntu Firewall

On the OCI Ubuntu image used during this install, local `iptables` rules allowed SSH on `22` but rejected other inbound ports. This can block `80` and `3000` even when OCI security lists are correct.

Inspect the firewall:

```bash
sudo iptables -S
sudo nft list ruleset
```

If the `INPUT` chain allows `22` and then rejects the rest, add rules for `80` and `3000`:

```bash
sudo iptables -I INPUT 5 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 5 -p tcp --dport 3000 -j ACCEPT
```

Verify:

```bash
sudo iptables -S
```

Persist the rules:

```bash
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

## 18. Run IMS As A Service

Do not rely on a foreground `npm start` session. Create a `systemd` service:

```bash
sudo tee /etc/systemd/system/ims.service > /dev/null <<'EOF'
[Unit]
Description=IMS Node App
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ims
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ims
sudo systemctl status ims --no-pager
```

Verify:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1/
```

## 19. Open The App

Once Nginx and the firewall are correct, browse to:

```text
http://YOUR_PUBLIC_IP/
```

For this app, seeded demo logins are:

- `admin@ims.local` / `Admin123!`
- `cfo@ims.local` / `Finance123!`
- `ops.test@ims.local` / `Ops123!`

## 20. Recommended Final State

For normal use:

- public access on `80`
- optional HTTPS on `443`
- no direct public dependency on `3000`
- IMS managed by `systemd`
- firewall rules saved with `iptables-persistent`

## Troubleshooting

### SSH works but the website does not

Check:

1. OCI ingress rule for `80`
2. Nginx is running
3. `curl http://127.0.0.1/` works on the VM
4. local `iptables` is not rejecting port `80`

### `curl http://127.0.0.1:3000/health` fails on the VM

The app is not running. Start it with:

```bash
npm start
```

or, if using `systemd`:

```bash
sudo systemctl restart ims
sudo systemctl status ims --no-pager
```

### `psql` fails when the password contains `!`

Use single quotes around the full PostgreSQL connection string:

```bash
psql 'postgresql://ims_app:ChangeThisStrongPassword123!@localhost:5432/ims' -f database/schema/001_ims_mvp.sql
```

### Windows SSH says the private key is too open

Fix the key ACL:

```powershell
$key = "C:\path\to\your-private-key.key"
icacls $key /inheritance:r
icacls $key /remove "Users" "Authenticated Users" "Everyone" "CodexSandboxUsers"
icacls $key /grant:r "${env:USERNAME}:R"
```

### Browser still cannot connect after OCI rules are correct

Test from Windows:

```powershell
Test-NetConnection YOUR_PUBLIC_IP -Port 80
```

If needed, test again with VPN disabled.

