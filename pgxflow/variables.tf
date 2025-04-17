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

# Pharmcat Lambda Function S3 Configuration
variable "data-portal-bucket-name" {
  type        = string
  description = "Name of the S3 bucket where the data portal files are stored."
}

variable "data-portal-bucket-arn" {
  type        = string
  description = "ARN of the S3 bucket where the data portal files are stored."
}

# PGxFlow Configuration
variable "hub_name" {
  type        = string
  description = "Configuration for the hub"
}

variable "pgxflow_configuration" {
  type = object({
    ORGANISATIONS = list(object({
      gene = string
      drug = string
    }))
    GENES = list(string)
    DRUGS = list(string)
  })
  description = "List of gene-drug organisation associations, genes to filter, and drugs to filter"

  validation {
    condition     = var.pgxflow_configuration != null
    error_message = "If PGxFlow is enabled, the pgxflow_configuration variable cannot be null"
  }
}

# Throttling variables
variable "method-max-request-rate" {
  type        = number
  description = "Maximum request rate for the method."
}

variable "method-queue-size" {
  type        = number
  description = "Maximum queue size for the method."
}

variable "web_acl_arn" {
  type        = string
  description = "arn of the WAF Web ACL to associate with the API's cloudfront distribution"
  default     = null
}

# external dynamodb tables
variable "dynamo-project-users-table" {
  type        = string
  description = "Dynamo project users table"
}

variable "dynamo-project-users-table-arn" {
  type        = string
  description = "Dynamo project users table ARN"
}

variable "dynamo-clinic-jobs-table" {
  type        = string
  description = "Dynamo clinic jobs table"
}

variable "dynamo-clinic-jobs-table-arn" {
  type        = string
  description = "Dynamo clinic jobs table ARN"
}

# cognito variables
variable "cognito-user-pool-arn" {
  type        = string
  description = "Cognito user pool ARN"
}
