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

# cognito variables
variable "cognito-user-pool-arn" {
  type        = string
  description = "Cognito user pool ARN"
}
