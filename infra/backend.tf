# Backend configuration for remote state
#
# IMPORTANT: Uncomment this block AFTER the first terraform apply
# The backend S3 bucket must exist before you can use it for state storage
#
# To migrate to remote state after first apply:
# 1. Uncomment the backend block below
# 2. Update the bucket name to match: terraform output terraform_state_bucket_name
# 3. Run: terraform init -migrate-state
#
# terraform {
#   backend "s3" {
#     bucket         = "movies-app-212612999379-terraform-state"
#     key            = "frontend/terraform.tfstate"
#     region         = "us-east-1"
#     encrypt        = true
#     dynamodb_table = "movies-app-212612999379-terraform-locks"
#   }
# }
