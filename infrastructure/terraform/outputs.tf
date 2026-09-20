output "resource_group_name" {
  description = "The name of the resource group created"
  value       = azurerm_resource_group.rg.name
}

output "deployment_mode" {
  description = "Active deployment architecture (vm or paas)"
  value       = var.deployment_mode
}

# ------------------------------------------------------------------------------
# Azure VM Outputs (Active when deployment_mode == "vm")
# ------------------------------------------------------------------------------
output "public_ip_address" {
  description = "The static public IP address of the CivicFlow VM"
  value       = try(azurerm_public_ip.public_ip[0].ip_address, null)
}

output "fqdn" {
  description = "The fully qualified domain name of the VM"
  value       = try(azurerm_public_ip.public_ip[0].fqdn, null)
}

output "ssh_command" {
  description = "Command to SSH directly into the VM"
  value       = try("ssh ${var.admin_username}@${azurerm_public_ip.public_ip[0].ip_address}", null)
}

output "app_url" {
  description = "Direct browser access URL for CivicFlow Frontend (Nginx High-Speed Port 80)"
  value       = try("http://${azurerm_public_ip.public_ip[0].ip_address}", null)
}

output "api_docs_url" {
  description = "Direct browser access URL for Swagger/OpenAPI Documentation"
  value       = try("http://${azurerm_public_ip.public_ip[0].ip_address}/docs", null)
}

# ------------------------------------------------------------------------------
# Azure PaaS Outputs (Active when deployment_mode == "paas")
# ------------------------------------------------------------------------------
output "static_web_app_url" {
  description = "URL for Azure Static Web App (Frontend)"
  value       = try("https://${azurerm_static_web_app.frontend[0].default_host_name}", null)
}

output "static_web_app_api_token" {
  description = "Deployment token for GitHub Actions (Azure Static Web Apps)"
  value       = try(azurerm_static_web_app.frontend[0].api_key, null)
  sensitive   = true
}

output "backend_app_service_url" {
  description = "URL for Azure Linux Web App (Backend API Gateway)"
  value       = try("https://${azurerm_linux_web_app.backend[0].default_hostname}", null)
}
