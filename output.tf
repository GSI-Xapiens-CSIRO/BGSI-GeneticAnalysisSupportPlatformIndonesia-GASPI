# sbeacon
output "api_url" {
  value       = module.sbeacon.api_url
  description = "URL used to invoke the API."
}

# cognito
output "cognito_client_id" {
  value       = module.cognito.cognito_client_id
  description = "Cognito client Id for user registration and login."
}

output "cognito_user_pool_id" {
  value       = module.cognito.cognito_user_pool_id
  description = "Cognito user pool Id."
}

output "admin_login_command" {
  value       = module.cognito.admin_login_command
  description = "Admin Login Command"
}
output "guest_login_command" {
  value       = module.cognito.guest_login_command
  description = "Guest Login Command"
}

# webgui
output "beacon_ui_url" {
  value       = module.webgui.cloudfront-url
  description = "URL of the webapp."
}
