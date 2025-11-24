provider "aws" {
  region = var.region
  default_tags {
    tags = var.common-tags
  }
}

data "aws_caller_identity" "this" {}
