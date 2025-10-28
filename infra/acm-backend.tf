# ACM Certificate for Backend ALB
# Note: You can either:
# 1. Use this to create a cert for a custom domain (api.example.com)
# 2. Use a self-signed cert for testing (not recommended)
# 3. Create cert manually and reference it

# Option 1: Create certificate for custom domain (recommended for production)
# Uncomment and configure if you have a domain:
#
# resource "aws_acm_certificate" "backend" {
#   domain_name       = var.backend_domain_name
#   validation_method = "DNS"
#
#   lifecycle {
#     create_before_destroy = true
#   }
#
#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-backend-cert-${var.environment}"
#     Environment = var.environment
#   })
# }
#
# resource "aws_acm_certificate_validation" "backend" {
#   certificate_arn = aws_acm_certificate.backend.arn
# }

# Option 2: Use existing certificate (if you already have one)
# Uncomment and set the ARN:
#
# data "aws_acm_certificate" "backend" {
#   domain   = var.backend_domain_name
#   statuses = ["ISSUED"]
# }

# For now, we'll use a workaround:
# Create a self-signed certificate via AWS CLI or manually in console
# Then reference it via data source

# Placeholder - you'll need to create the certificate first
# See HTTPS-SETUP.md for instructions
