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

# Lookup Lambda Function S3 Configuration
variable "data-portal-bucket-name" {
  type        = string
  description = "Name of the S3 bucket where the data portal files are stored."
}

variable "data-portal-bucket-arn" {
  type        = string
  description = "ARN of the S3 bucket where the data portal files are stored."
}

variable "pgxflow-backend-bucket-name" {
  type        = string
  description = "Name of the S3 bucket where intermediate PGxFlow results are stored"
}

variable "pgxflow-backend-bucket-arn" {
  type        = string
  description = "ARN of the S3 bucket where intermediate PGxFlow results are stored"
}

variable "pgxflow-reference-bucket-name" {
  type        = string
  description = "Name of the S3 bucket where PGxFlow reference files are stored"
}

variable "pgxflow-reference-bucket-arn" {
  type        = string
  description = "ARN of the S3 bucket where PGxFlow reference files are stored"
}

# PGxFlow Configuration
variable "hub_name" {
  type        = string
  description = "Configuration for the hub"
}

variable "dbsnp_reference" {
  type        = string
  description = "Base filename of the dbSNP reference file"
  default     = "dbsnp.vcf.gz"
}

variable "send-job-email-lambda-function-arn" {
  type        = string
  description = "ARN for the sendJobEmail lambda function"
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

variable "dynamo-references-table" {
  type        = string
  description = "Dynamo PGxFlow references table"
}

variable "dynamo-references-table-arn" {
  type        = string
  description = "Dynamo PGxFlow references table ARN"
}

variable "ec2-references-instance-role-arn" {
  type        = string
  description = "EC2 instance role ARN for the references instance"
}

variable "ec2-references-instance-profile" {
  type        = string
  description = "EC2 instance profile for the references instance"
}

# cognito variables
variable "cognito-user-pool-arn" {
  type        = string
  description = "Cognito user pool ARN"
}

variable "cognito-user-pool-id" {
  type        = string
  description = "Cognito user pool Id."
}

# lambda layer definitions
variable "python_libraries_layer" {
  type        = string
  description = "Third party python layer"
}

variable "python_modules_layer" {
  type        = string
  description = "First party python layer"
}

variable "binaries_layer" {
  type        = string
  description = "Binaries layer"
}

variable "lookup_configuration" {
  type = object({
    assoc_matrix_filename = string
    chr_header            = string
    start_header          = string
    end_header            = string
  })
  description = "Configuration for the lookup table"
  default     = null
}
