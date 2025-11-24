variable "region" {
  type        = string
  description = "AWS region"
}

variable "common-tags" {
  type        = map(string)
  description = "A set of tags to attach to every created resource."
}

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

variable "dataportal-bucket-prefix" {
  type        = string
  description = "Prefix for bucket names"
}

variable "ses-source-email" {
  type        = string
  description = "Address from which to send emails"
}

variable "bui-ssm-parameter-name" {
  type        = string
  description = "Name of the ssm parameter storing cloudfront URL"
}
