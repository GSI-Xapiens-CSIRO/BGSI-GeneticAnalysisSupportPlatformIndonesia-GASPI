resource "aws_cloudfront_origin_access_control" "bui-s3-distribution" {
  name                              = "webgui-access-control"
  description                       = "Policy for BeaconUI"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_cloudfront_cache_policy" "bui-s3-distribution-cache-policy" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_response_headers_policy" "bui-security-headers-policy" {
  name = "bui-security-headers-policy"

  security_headers_config {
  content_security_policy {
    override = true
    content_security_policy = join(" ", [
      "default-src 'none';",
      "script-src 'self' 'sha256-2P8mXF+NOGY5a6oJ1jDjLINrckn9RgJYdEesn+Qf4rQ=' https://cdn.jsdelivr.net/npm/igv@3.1.2/dist/igv.min.js;",
      "style-src 'self' 'unsafe-inline';",
      "font-src 'self' https://fonts.gstatic.com;",
      "img-src 'self' data: content: blob: https://${var.data_portal_bucket}.s3.${var.region}.amazonaws.com;",
      "form-action 'self';",

      "connect-src 'self' ${var.api_endpoint_sbeacon} ${var.api_endpoint_clinic}",
      "https://cognito-identity.${var.region}.amazonaws.com https://cognito-idp.${var.region}.amazonaws.com",
      "https://${var.data_portal_bucket}.s3.${var.region}.amazonaws.com https://api.pricing.us-east-1.amazonaws.com",
      "https://secretsmanager.${var.region}.amazonaws.com https://kms.${var.region}.amazonaws.com",
      "https://igv.org/genomes/ https://hgdownload.soe.ucsc.edu/goldenPath/hg38/ https://eutils.ncbi.nlm.nih.gov/entrez/eutils/ https://r4.ontoserver.csiro.au https://www.ebi.ac.uk;",
      "frame-ancestors 'none';",
      "base-uri 'self';",
      "object-src 'none';",
      "manifest-src 'self';",
    ])
  }

    content_type_options {
      override = true
    }

    frame_options {
      override     = true
      frame_option = "DENY"
    }

    xss_protection {
      override   = true
      protection = true
      mode_block = true
    }

    strict_transport_security {
      override                   = true
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
    }

    referrer_policy {
      override        = true
      referrer_policy = "no-referrer"
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      override = true
      value    = "geolocation=(), microphone=(), camera=(), payment=(), accelerometer=(), fullscreen=*"
    }
  }
}

resource "aws_cloudfront_distribution" "bui-s3-distribution" {
  origin {
    domain_name              = aws_s3_bucket.bui-hosted-bucket.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.bui-s3-distribution.id
    origin_id                = "webgui-s3-origin-id"
  }

  comment             = "Distribution for BeaconUI"
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  default_root_object = "index.html"
  web_acl_id          = var.web_acl_arn

  custom_error_response {
    response_code      = 200
    error_code         = 404
    response_page_path = "/index.html"
  }

  custom_error_response {
    response_code      = 200
    error_code         = 403
    response_page_path = "/index.html"
  }

  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "webgui-s3-origin-id"
    cache_policy_id            = data.aws_cloudfront_cache_policy.bui-s3-distribution-cache-policy.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.bui-security-headers-policy.id
    compress                   = true
    viewer_protocol_policy     = "redirect-to-https"
  }

  price_class = "PriceClass_200"

  restrictions {
    geo_restriction {
      restriction_type = "none"
      locations        = []
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = var.common-tags
}
