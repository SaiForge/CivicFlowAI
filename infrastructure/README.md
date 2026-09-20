# CivicFlowAI Infrastructure & Azure Deployment Guide

High-performance, container-free native deployment for **CivicFlowAI** on Microsoft Azure, featuring:
- **Native Azure Linux VM** (Ubuntu 22.04 LTS) with Linux `systemd` process supervisors and **0 Docker containers**.
- **High-Performance Nginx Reverse Proxy** delivering the React Vite frontend with Gzip compression (level 6), 1-year immutable asset caching, microsecond TTFB, and zero-buffering Server-Sent Events (`/api/events`).
- **Supabase Cloud PostgreSQL** providing enterprise managed database persistence with connection pooling and SSL encryption.
- **Infrastructure-as-Code (Terraform)** supporting both **Native Azure VM** and **Azure PaaS (Static Web Apps + App Service)** via a single toggle.
- **GitHub Actions CI/CD** with automated quality gates, linting, frontend builds, and zero-downtime SSH deployment.

---

## Architecture Overview

```
                                    ┌───────────────────────────────────┐
                                    │             Internet              │
                                    └─────────────────┬─────────────────┘
                                                      │ HTTP: 80 / HTTPS: 443
                                                      ▼
┌─────────────────────────────────────── Azure Virtual Machine ───────────────────────────────────────┐
│                                                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                     Nginx Reverse Proxy                                     │   │
│   │   • Serves React SPA build directly from /var/www/civicflow/dist with Gzip compression      │   │
│   │   • 1-year immutable caching for Vite hashed assets (/assets/*)                             │   │
│   │   • Reverse proxy /api/ and /docs to Backend API Gateway (127.0.0.1:5000)                   │   │
│   │   • Unbuffered SSE streaming for realtime updates (/api/events)                             │   │
│   └──────────────────────────────────────────────┬──────────────────────────────────────────────┘   │
│                                                  │                                                  │
│                        ┌─────────────────────────┴─────────────────────────┐                        │
│                        ▼                                                   ▼                        │
│   ┌──────────────────────────────────────────┐        ┌─────────────────────────────────────────┐   │
│   │            civicflow-backend             │        │             civicflow-agent             │   │
│   │        FastAPI Gateway (:5000)           │◄──────►│       Multi-Agent Core Engine (:8000)   │   │
│   │        Managed by Linux systemd          │internal│         Managed by Linux systemd        │   │
│   └────────────────────┬─────────────────────┘        └────────────────────┬────────────────────┘   │
│                        │                                                   │                        │
│                        │  Redis Pub/Sub (:6379)                            │                        │
│                        └───────────────────────► ◄─────────────────────────┘                        │
│                                                  │                                                  │
│                                                  ▼                                                  │
│                                    ┌──────────────────────────┐                                     │
│                                    │   Native Redis Server    │                                     │
│                                    │ Managed by Linux systemd │                                     │
│                                    └──────────────────────────┘                                     │
└──────────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                                   │
                                                   │ TLS Connection (Port 5432 / 6543)
                                                   ▼
                                    ┌─────────────────────────────┐
                                    │    Supabase PostgreSQL      │
                                    │   Managed Cloud Database    │
                                    │  (Complaints, Auth, Audit)  │
                                    └─────────────────────────────┘
```

---

## Directory Structure

```
infrastructure/
├── nginx/
│   └── civicflow.conf            # High-performance Nginx config (gzip, cache, SSE proxy)
├── systemd/
│   ├── civicflow-backend.service # Systemd unit for FastAPI Gateway (Port 5000)
│   └── civicflow-agent.service   # Systemd unit for Multi-Agent AI Core (Port 8000)
├── scripts/
│   └── deploy-native.sh          # Automated idempotent VM deployment script
└── terraform/
    ├── main.tf                   # Azure VM, VNet, NSG, Cloud-Init, and optional PaaS resources
    ├── variables.tf              # Input variables (deployment_mode, VM size, Supabase URL)
    ├── outputs.tf                # Outputs (Public IP, Nginx App URL, API docs, SSH command)
    └── terraform.tfvars.example  # Template configuration file
```

---

## Step 1: Set Up Free Supabase Database

1. Sign up or log into [Supabase](https://supabase.com).
2. Create a new project (e.g. `civicflow-prod`) and select your closest AWS region.
3. Once provisioned, navigate to **Project Settings** → **Database**.
4. Copy the **Connection String** (Transaction pooler on port `6543` or direct on port `5432`):
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```

---

## Step 2: Provision Azure Infrastructure with Terraform

### Prerequisites
1. [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and authenticated:
   ```bash
   az login
   ```
2. [Terraform](https://developer.hashicorp.com/terraform/downloads) (>= 1.3.0) installed.
3. An SSH key pair on your machine (e.g. `~/.ssh/id_rsa.pub`):
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa
   ```

### Provisioning Steps
1. Navigate to the terraform directory:
   ```bash
   cd infrastructure/terraform
   ```
2. Create your `terraform.tfvars` from the example:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
3. Edit `terraform.tfvars`:
   ```hcl
   resource_group_name   = "rg-civicflow-prod"
   location              = "centralindia"
   deployment_mode       = "vm"
   vm_size               = "Standard_B2s"
   admin_username        = "azureuser"
   ssh_public_key_path   = "~/.ssh/id_rsa.pub"
   dns_prefix            = "civicflow-ai-portal"
   supabase_database_url = "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"
   openrouter_api_key    = "sk-or-v1-xxxxxxxxxxxxxxxx"
   ```
4. Initialize and apply Terraform:
   ```bash
   terraform init
   terraform plan
   terraform apply -auto-approve
   ```
5. Note the outputs:
   ```
   Outputs:
   app_url           = "http://20.120.45.12"
   api_docs_url      = "http://20.120.45.12/docs"
   public_ip_address = "20.120.45.12"
   ssh_command       = "ssh azureuser@20.120.45.12"
   ```

---

## Step 3: Initial Manual Deployment or Verification

If you wish to trigger the initial deployment directly via SSH:
```bash
# 1. SSH into the Azure VM
ssh azureuser@<VM_PUBLIC_IP>

# 2. Clone the repository
git clone https://github.com/YOUR_USERNAME/CivicFlowAI.git
cd CivicFlowAI

# 3. Create the production environment file
cat << 'EOF' > .env
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
REDIS_URL=redis://127.0.0.1:6379/0
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL_NAME=openai/gpt-4o-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
AGENT_DELAY_SECONDS=5.0
AGENT_SERVICE_URL=http://127.0.0.1:8000
BACKEND_PORT=5000
SECRET_KEY=change_me_to_a_secure_random_string_2026
ACCESS_TOKEN_EXPIRE_MINUTES=1440
LOG_LEVEL=INFO
EOF

cp .env agent/.env
cp .env backend/.env

# 4. Run the automated native deployment script
chmod +x infrastructure/scripts/deploy-native.sh
./infrastructure/scripts/deploy-native.sh
```

---

## Step 4: Configure GitHub Actions CI/CD

To enable automated zero-downtime deployments on git push to `main`:

In your GitHub repository, navigate to **Settings** → **Secrets and variables** → **Actions**, and add the following repository secrets:

| Secret Name | Description | Example / Value |
|---|---|---|
| `AZURE_VM_HOST` | Static Public IP of your Azure VM | `20.120.45.12` |
| `AZURE_VM_USERNAME` | Administrator username | `azureuser` |
| `AZURE_VM_SSH_KEY` | Private SSH Key (contents of `~/.ssh/id_rsa`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SUPABASE_DATABASE_URL` | Supabase connection string | `postgresql://postgres.[ref]:[pass]@...:6543/postgres?sslmode=require` |
| `OPENROUTER_API_KEY` | OpenRouter API Key for multi-agent deliberation | `sk-or-v1-...` |
| `SECRET_KEY` | JWT signing secret | Secure random string (e.g. `openssl rand -hex 32`) |

Whenever you push code to `main`, GitHub Actions will:
1. Run automated multi-agent rubric and unit tests.
2. Build and bundle the React frontend with Vite.
3. SSH into the Azure VM, pull latest changes, update Python and npm dependencies, recompile static assets, reload Nginx, and restart systemd services.
4. Run health checks against `http://127.0.0.1:5000/health` and Nginx.

---

## Useful VM Management Commands

```bash
# View live logs for Backend API Gateway
journalctl -u civicflow-backend -f

# View live logs for Multi-Agent AI Engine
journalctl -u civicflow-agent -f

# View Nginx access & error logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Restart services
sudo systemctl restart civicflow-backend civicflow-agent nginx redis-server

# Check service statuses
systemctl status civicflow-backend civicflow-agent nginx redis-server
```

---

## Setting Up Free SSL with Let's Encrypt (HTTPS)

Once your custom domain or Azure DNS name points to the VM's public IP:
```bash
sudo certbot --nginx -d yourdomain.com -d civicflow-ai-portal.centralindia.cloudapp.azure.com
```
Certbot will automatically update `/etc/nginx/sites-available/civicflow` with SSL certificates and set up automatic renewal cron jobs.
