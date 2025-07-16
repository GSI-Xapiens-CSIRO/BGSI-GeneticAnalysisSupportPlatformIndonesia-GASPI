resource "aws_wafv2_web_acl" "security-all-cloudfront" {
  name        = "security-all-cloudfront"
  description = "WAF to be applied to all cloudfront distributions"
  provider    = aws.us-east-1
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "security-all-cloudfront-IP-rate-limiting"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.max-request-rate-per-5mins
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "security-all-cloudfront-IP-rate-limiting-rule-metric"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "security-all-cloudfront-common-ruleset"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        rule_action_override {
          action_to_use {
            count {}
          }

          name = "SizeRestrictions_BODY"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "security-all-cloudfront-common-ruleset-rule-metric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "security-all-cloudfront-metric"
    sampled_requests_enabled   = true
  }
}
