# AWS region variable
variable "region" {
  type        = string
  description = "Deployment region."
}

# GASPIFS binary destination variable
variable "gaspifs_binary_destination" {
  type        = string
  description = "S3 bucket destination for GASPIFS binary."
}

# Authentication and API variables
variable "cognito_user_pool_client_id" {
  type        = string
  description = "Cognito user pool client ID."
}

variable "cli_backend_api_url" {
  type        = string
  description = "API URL for the CLI backend."
}
