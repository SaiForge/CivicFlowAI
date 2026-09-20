terraform {
  required_version = ">= 1.3.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# ==============================================================================
# 1. Resource Group
# ==============================================================================
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "CivicFlowAI"
    Mode        = var.deployment_mode
  }
}

# ==============================================================================
# 2. Azure VM Infrastructure (Active when deployment_mode == "vm")
#    Native Ubuntu 22.04 LTS with Nginx, Systemd, Redis, & Python venv (0 Containers)
# ==============================================================================

# Virtual Network & Subnet
resource "azurerm_virtual_network" "vnet" {
  count               = var.deployment_mode == "vm" ? 1 : 0
  name                = "${var.vm_name}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  tags = azurerm_resource_group.rg.tags
}

resource "azurerm_subnet" "subnet" {
  count                = var.deployment_mode == "vm" ? 1 : 0
  name                 = "${var.vm_name}-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet[0].name
  address_prefixes     = ["10.0.1.0/24"]
}

# Static Public IP with DNS Prefix
resource "azurerm_public_ip" "public_ip" {
  count               = var.deployment_mode == "vm" ? 1 : 0
  name                = "${var.vm_name}-pip"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
  domain_name_label   = var.dns_prefix

  tags = azurerm_resource_group.rg.tags
}

# Network Security Group (NSG) — Port 80 (HTTP), 443 (HTTPS), 22 (SSH)
resource "azurerm_network_security_group" "nsg" {
  count               = var.deployment_mode == "vm" ? 1 : 0
  name                = "${var.vm_name}-nsg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  # Allow SSH Management
  security_rule {
    name                       = "Allow-SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # Allow High-Speed HTTP (Nginx Port 80)
  security_rule {
    name                       = "Allow-HTTP-80"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # Allow High-Speed HTTPS (Nginx Port 443)
  security_rule {
    name                       = "Allow-HTTPS-443"
    priority                   = 1003
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = azurerm_resource_group.rg.tags
}

# Network Interface (NIC)
resource "azurerm_network_interface" "nic" {
  count               = var.deployment_mode == "vm" ? 1 : 0
  name                = "${var.vm_name}-nic"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet[0].id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.public_ip[0].id
  }

  tags = azurerm_resource_group.rg.tags
}

resource "azurerm_network_interface_security_group_association" "nic_nsg" {
  count                     = var.deployment_mode == "vm" ? 1 : 0
  network_interface_id      = azurerm_network_interface.nic[0].id
  network_security_group_id = azurerm_network_security_group.nsg[0].id
}

# Cloud-Init User Data Script: Native OS & High-Performance Nginx Setup (NO DOCKER)
locals {
  cloud_init_native = <<-EOF
    #!/bin/bash
    set -e

    echo "=== Initializing CivicFlowAI Native Host ==="

    # 1. Update system packages
    export DEBIAN_FRONTEND=noninteractive
    apt-get update && apt-get upgrade -y

    # 2. Setup 4GB Swap Space for multi-agent LLM process stability
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    # 3. Install core system prerequisites, Python 3.11, Nginx, Redis, and build tools
    apt-get install -y \
      ca-certificates \
      curl \
      gnupg \
      git \
      ufw \
      nginx \
      redis-server \
      python3 \
      python3-pip \
      python3-venv \
      python3-dev \
      build-essential \
      libpq-dev \
      certbot \
      python3-certbot-nginx

    # 4. Install Node.js 20.x LTS from official NodeSource repository
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    apt-get update
    apt-get install -y nodejs

    # 5. Enable and configure native Redis server
    systemctl enable redis-server
    systemctl start redis-server

    # 6. Configure static web directory with correct permissions
    mkdir -p /var/www/civicflow/dist
    chown -R www-data:www-data /var/www/civicflow
    chmod -R 755 /var/www/civicflow

    # 7. Configure firewall
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable

    echo "=== CivicFlowAI Native Host Provisioning Complete ==="
  EOF
}

# Linux Virtual Machine (Ubuntu 22.04 LTS)
resource "azurerm_linux_virtual_machine" "vm" {
  count                 = var.deployment_mode == "vm" ? 1 : 0
  name                  = var.vm_name
  resource_group_name   = azurerm_resource_group.rg.name
  location              = azurerm_resource_group.rg.location
  size                  = var.vm_size
  admin_username        = var.admin_username
  network_interface_ids = [azurerm_network_interface.nic[0].id]

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(pathexpand(var.ssh_public_key_path))
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
    disk_size_gb         = 64
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  custom_data = base64encode(local.cloud_init_native)

  tags = azurerm_resource_group.rg.tags
}

# ==============================================================================
# 3. Azure PaaS Infrastructure (Active when deployment_mode == "paas")
#    Azure Static Web Apps + Azure App Service (Linux Web Apps)
# ==============================================================================

# 3a. Azure Static Web Apps for Frontend SPA
resource "azurerm_static_web_app" "frontend" {
  count               = var.deployment_mode == "paas" ? 1 : 0
  name                = "civicflow-swa-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = "eastus2" # Static Web Apps available region
  sku_tier            = "Free"
  sku_size            = "Free"

  tags = azurerm_resource_group.rg.tags
}

# 3b. Linux App Service Plan
resource "azurerm_service_plan" "app_plan" {
  count               = var.deployment_mode == "paas" ? 1 : 0
  name                = "civicflow-asp-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = var.app_service_plan_sku

  tags = azurerm_resource_group.rg.tags
}

# 3c. Backend API Gateway Linux Web App
resource "azurerm_linux_web_app" "backend" {
  count               = var.deployment_mode == "paas" ? 1 : 0
  name                = "civicflow-api-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  service_plan_id     = azurerm_service_plan.app_plan[0].id

  site_config {
    application_stack {
      python_version = "3.11"
    }
    app_command_line = "gunicorn -w 2 -k uvicorn.workers.UvicornWorker app.main:app"
  }

  app_settings = {
    "DATABASE_URL"                 = var.supabase_database_url
    "AGENT_SERVICE_URL"            = var.deployment_mode == "paas" ? "https://${azurerm_linux_web_app.agent[0].default_hostname}" : "http://127.0.0.1:8000"
    "BACKEND_PORT"                 = "8000"
    "ACCESS_TOKEN_EXPIRE_MINUTES"  = "1440"
    "LOG_LEVEL"                    = "INFO"
  }

  tags = azurerm_resource_group.rg.tags
}

# 3d. Multi-Agent AI Core Linux Web App
resource "azurerm_linux_web_app" "agent" {
  count               = var.deployment_mode == "paas" ? 1 : 0
  name                = "civicflow-agent-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  service_plan_id     = azurerm_service_plan.app_plan[0].id

  site_config {
    application_stack {
      python_version = "3.11"
    }
    app_command_line = "gunicorn -w 1 -k uvicorn.workers.UvicornWorker app.main:app"
  }

  app_settings = {
    "LLM_PROVIDER"          = "openrouter"
    "OPENROUTER_API_KEY"    = var.openrouter_api_key
    "OPENROUTER_MODEL_NAME" = var.openrouter_model_name
    "DATABASE_URL"          = var.supabase_database_url
    "AGENT_DELAY_SECONDS"   = "5.0"
    "CONFIDENCE_THRESHOLD"  = "0.7"
    "MAX_RETRIES"           = "2"
    "LOG_LEVEL"             = "INFO"
  }

  tags = azurerm_resource_group.rg.tags
}
