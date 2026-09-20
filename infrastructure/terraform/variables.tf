variable "resource_group_name" {
  description = "Name of the Azure Resource Group"
  type        = string
  default     = "rg-civicflow-prod"
}

variable "location" {
  description = "Azure region for all resources (e.g. southeastasia, centralindia, eastasia)"
  type        = string
  default     = "southeastasia"
}

variable "environment" {
  description = "Deployment environment tag (e.g. dev, staging, prod)"
  type        = string
  default     = "prod"
}

# ------------------------------------------------------------------------------
# Deployment Mode
# ------------------------------------------------------------------------------
variable "deployment_mode" {
  description = "Deployment architecture: 'vm' for native Azure VM with Nginx & systemd (no containers), or 'paas' for Azure Static Web Apps + Azure App Service."
  type        = string
  default     = "vm"

  validation {
    condition     = contains(["vm", "paas"], var.deployment_mode)
    error_message = "The deployment_mode variable must be either 'vm' or 'paas'."
  }
}

# ------------------------------------------------------------------------------
# Azure VM Settings (used when deployment_mode = "vm")
# ------------------------------------------------------------------------------
variable "vm_name" {
  description = "Name of the Linux Virtual Machine"
  type        = string
  default     = "civicflow-vm"
}

variable "vm_size" {
  description = "Size of the Azure VM. Standard_B1s (~$3.80/mo) is the cheapest available option in Central India."
  type        = string
  default     = "Standard_B1s"
}

variable "admin_username" {
  description = "Administrator username for the VM"
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key file for VM access"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "dns_prefix" {
  description = "Globally unique DNS label for the public IP address (<dns_prefix>.<location>.cloudapp.azure.com)"
  type        = string
  default     = "civicflow-ai-portal"
}

# ------------------------------------------------------------------------------
# Azure PaaS Settings (used when deployment_mode = "paas")
# ------------------------------------------------------------------------------
variable "app_service_plan_sku" {
  description = "SKU for the Linux App Service Plan if using PaaS mode (e.g., F1, B1, P1v2)"
  type        = string
  default     = "B1"
}

# ------------------------------------------------------------------------------
# Managed Database (Supabase) & AI Configuration
# ------------------------------------------------------------------------------
variable "supabase_database_url" {
  description = "Connection string for Supabase PostgreSQL (e.g., postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "openrouter_api_key" {
  description = "OpenRouter API Key for Multi-Agent AI deliberation"
  type        = string
  default     = ""
  sensitive   = true
}

variable "openrouter_model_name" {
  description = "Model identifier for OpenRouter (e.g., openai/gpt-4o-mini)"
  type        = string
  default     = "openai/gpt-4o-mini"
}
