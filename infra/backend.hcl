# Backend configuration file
# This file allows you to use variables for backend configuration
#
# Usage after first terraform apply:
# 1. Run: terraform output terraform_state_bucket_name
# 2. Update bucket name below if needed
# 3. Run: terraform init -backend-config=backend.hcl -migrate-state

bucket         = "movies-app-212612999379-terraform-state"
key            = "frontend/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "movies-app-212612999379-terraform-locks"
