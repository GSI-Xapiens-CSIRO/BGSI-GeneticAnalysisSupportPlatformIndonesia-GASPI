# common
variable "region" {
  type        = string
  description = "AWS region"
}


variable "common-tags" {
  type        = map(string)
  description = "A set of tags to attach to every created resource."
}

variable "common-tags-backup" {
  type        = map(string)
  description = "Tags needed to enable and configure backups."
  default = {
    backup = "true"
  }
}

variable "svep-references-table-name" {
  type        = string
  description = "Name of the sVEP references table"
  default     = "svep-references"
}

variable "pgxflow-references-table-name" {
  type        = string
  description = "Name of the PGxFlow references table"
  default     = "pgxflow-references"
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

# Hub configurations
variable "hub_name" {
  type        = string
  description = "Configuration for the hub"
  default     = "NONE"

  validation {
    condition     = contains(["BGSI", "RSCM", "RSSARDJITO", "RSPON", "RSIGNG", "RSJPD"], var.hub_name)
    error_message = "hub_name must be one of: BGSI, RSCM, RSSARDJITO, RSPON, RSIGNG, RSJPD"
  }
}

variable "svep-filters" {
  type = object({
    clinvar_exclude = optional(list(string), [])
    # highest consequence rank to include, e.g. 12 for protein_altering_variant.
    # see svep/lambda/pluginConsequence/consequence/constants.pm for values.
    consequence_rank = optional(number, 99)
    genes            = optional(list(string), [])
    max_maf          = optional(number, 1)
    min_qual         = optional(number, 0)
  })
  description = "Filters to apply to the svep records"
  default     = {}
  nullable    = true
}

variable "clinic-warning-thresholds" {
  type = object({
    qual   = optional(number, 0)
    filter = optional(string, "")
    dp     = optional(number, 0)
    gq     = optional(number, 0)
    mq     = optional(number, 0)
    qd     = optional(number, 0)
  })
  description = "Thresholds before warnings are shown in clinic results page"
  default     = {}
  nullable    = true
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
  default = {
    ORGANISATIONS = []
    GENES         = []
    DRUGS         = []
  }
  nullable = true
}

variable "lookup_configuration" {
  type = object({
    assoc_matrix_filename = string
    chr_header            = string
    start_header          = string
    end_header            = string
  })
  description = "Filename and header information (chr, start, end) for the association matrix"
  default = {
    assoc_matrix_filename = ""
    chr_header            = ""
    start_header          = ""
    end_header            = ""
  }
  nullable = true
}
