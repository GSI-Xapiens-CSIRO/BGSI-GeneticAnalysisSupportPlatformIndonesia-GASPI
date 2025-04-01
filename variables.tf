# common
variable "region" {
  type        = string
  description = "AWS region"
}


variable "common-tags" {
  type        = map(string)
  description = "A set of tags to attach to every created resource."
}

# portal variables
variable "gaspi-guest-username" {
  type        = string
  description = "Value for guest username (must be an email)"
}

variable "gaspi-guest-password" {
  type        = string
  description = "Value for guest password"
}

variable "gaspi-admin-username" {
  type        = string
  description = "Value for admin username  (must be an email)"
}

variable "gaspi-admin-password" {
  type        = string
  description = "Value for admin password"
}

# bucket prefixes
variable "variants-bucket-prefix" {
  type        = string
  description = "Prefix for the variants S3 bucket"
}

variable "metadata-bucket-prefix" {
  type        = string
  description = "Prefix for the metadata S3 bucket"
}

variable "lambda-layers-bucket-prefix" {
  type        = string
  description = "Prefix for the lambda layers S3 bucket"
}

variable "dataportal-bucket-prefix" {
  type        = string
  description = "Prefix for the dataportal S3 bucket"
}

variable "ses-source-email" {
  type        = string
  description = "Address from which to send SES emails"
}

variable "gaspi-admin-email" {
  type        = string
  description = "Email address of the administrator to send security alerts"
}

# Will be removed when DNS records are available for use
variable "bui-ssm-parameter-name" {
  type        = string
  description = "Name of the SSM parameter storing the Beacon UI URL"
  default     = "bui-ssm-beacon-ui-url"
}

variable "clinic-mode" {
  type        = string
  description = "Specifies whether to enable sVEP or PGxFlow in the clinic"
  default     = "svep"
  validation {
    condition     = contains(["svep", "pgxflow"], var.clinic-mode)
    error_message = "Valid options for clinic_mode are 'svep' or 'pgxflow'."
  }
}

variable "pgxflow-configuration" {
  type        = map(list(string))
  description = "Environment variable configuration for pgxflow"
}

variable "enable-inspector" {
  description = "Enables inspector scanning"
  type        = bool
  default     = true
}

# Throttling variables
variable "sbeacon-method-max-request-rate" {
  type        = number
  description = "Number of requests allowed per second per method for sbeacon API."
  default     = 100
}

variable "sbeacon-method-queue-size" {
  type        = number
  description = "Number of requests allowed to be queued per method for sbeacon API."
  default     = 1000
}

variable "svep-method-max-request-rate" {
  type        = number
  description = "Number of requests allowed per second per method for svep API."
  default     = 100
}

variable "svep-method-queue-size" {
  type        = number
  description = "Number of requests allowed to be queued per method for svep API."
  default     = 1000
}

variable "pgxflow-method-max-request-rate" {
  type        = number
  description = "Number of requests allowed per second per method for pgxflow API"
  default     = 100
}

variable "pgxflow-method-queue-size" {
  type        = number
  description = "Number of requests allowed to be queued per method for pgxflow API"
  default     = 1000
}

variable "max-request-rate-per-5mins" {
  type        = number
  description = "Maximum number of requests allowed per IP address per 5 minutes"
  default     = 10000
}
