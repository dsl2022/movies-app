# Backend configuration for remote state
#
# This backend configuration is now enabled because the S3 bucket and DynamoDB table
# were created in a previous deployment. Terraform will use these for state storage
# and locking, which prevents the "resource already exists" errors.
#
terraform {
  backend "s3" {
    bucket         = "movies-app-212612999379-terraform-state"
    key            = "frontend/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "movies-app-terraform-locks"
  }
}
