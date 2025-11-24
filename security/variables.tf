# AWS region variable
variable "region" {
  type        = string
  description = "Deployment region."
}

# AWS configuration
variable "common-tags" {
  type        = map(string)
  description = "A set of tags to attach to every created resource."
}

# Conditionally enable AWS Inspector - required for environments where this is externally managed
variable "enable-inspector" {
  type        = bool
  description = "Enables AWS Inspector."
}

# Inspector variables
variable "inspector-enabled-resource-types" {
    description = "List of resource types to enable Inspector on"
    type        = list(string)
    default     = ["ECR", "LAMBDA"]
}

# SES variables
variable "ses-source-email" {
  type        = string
  description = "Address from which to send emails"
}

variable "gaspi-admin-email" {
  type = string
  description = "Email address of the administrator to send security alerts"
}

variable "max-request-rate-per-5mins" {
  type        = number
  description = "Maximum number of requests allowed per IP address per 5 minutes"
}
