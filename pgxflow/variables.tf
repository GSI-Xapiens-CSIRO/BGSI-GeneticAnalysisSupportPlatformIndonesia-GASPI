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

variable "common-tags-backup" {
  type        = map(string)
  description = "Tags needed to enable and configure backups."
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

variable "clinic-job-email-lambda-function-arn" {
  type        = string
  description = "Lambda function ARN for sending Clinic Job emails"
}

# cognito variables
variable "cognito-user-pool-arn" {
  type        = string
  description = "Cognito user pool ARN"
}

variable "cognito-user-pool-id" {
  type        = string
  description = "Cognito user pool ID"
}

variable "pgxflow-references-table-name" {
  type        = string
  description = "Name of the references table"
}

# PGxFlow Configuration
variable "hub_name" {
  type        = string
  description = "Configuration for the hub"
}

variable "pharmcat_configuration" {
  type = object({
    ORGANISATIONS = list(object({
      gene = string
      drug = string
    }))
    GENES = list(string)
    DRUGS = list(string)
  })
  description = "List of gene-drug organisation associations, genes to filter, and drugs to filter"
}

variable "lookup_configuration" {
  type = object({
    assoc_matrix_filename = string
    chr_header            = string
    start_header          = string
    end_header            = string
  })
  description = "Filename and header information (chr, start, end) for the association matrix"
}
