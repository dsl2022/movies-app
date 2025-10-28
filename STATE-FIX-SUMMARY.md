# Terraform State Fix Summary

## Problem

GitHub Actions was failing with "resource already exists" errors for ALB, CloudFront OAC, CloudWatch logs, IAM roles, S3 buckets, and DynamoDB table.

Root cause: The backend configuration in [infra/backend.tf](infra/backend.tf) was commented out, causing Terraform to use fresh local state on each run instead of loading the existing remote state from S3.

## Root Cause Analysis

1. **Initial issue**: Backend configuration was commented out to solve a bootstrapping problem
2. **Side effect**: Terraform lost track of existing resources because it wasn't loading state from S3
3. **Compounding issue**: Mixed resource naming - some resources used `movies-app-*` naming, others used `movies-app-212612999379-*`

### Resource Naming Investigation

After analyzing AWS resources and the state file, found:

**Resources with account ID** (globally unique):
- S3 frontend bucket: `movies-app-212612999379-frontend-dev`
- S3 terraform state: `movies-app-212612999379-terraform-state`
- ECR repository: `movies-app-212612999379-backend-dev`

**Resources without account ID**:
- ECS cluster: `movies-app-cluster-dev`
- ECS service: `movies-app-backend-service-dev`
- ALB: `movies-app-be-alb-dev`
- DynamoDB: `movies-app-terraform-locks`
- IAM roles: `movies-app-ecs-task-*-dev`

This mixed naming occurred because Terraform was run at different times with different `project_name` values.

## Solution Applied

###  1. Re-enabled Remote Backend

**File**: [infra/backend.tf](infra/backend.tf:7-15)

```hcl
terraform {
  backend "s3" {
    bucket         = "movies-app-212612999379-terraform-state"
    key            = "frontend/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "movies-app-terraform-locks"  # Note: no account ID
  }
}
```

**Key detail**: DynamoDB table name is `movies-app-terraform-locks` (without account ID) even though bucket has account ID.

### 2. Standardized Resource Naming

**File**: [infra/terraform.tfvars](infra/terraform.tfvars:7)

```hcl
project_name = "movies-app"  # Without account ID
```

### 3. Added Account ID Data Source

**File**: [infra/main.tf](infra/main.tf:25-26)

```hcl
# Get AWS account ID for unique resource naming
data "aws_caller_identity" "current" {}
```

### 4. Updated S3 and ECR to Use Account ID

**Files modified**:
- [infra/s3-frontend.tf](infra/s3-frontend.tf:3)
- [infra/s3-backend.tf](infra/s3-backend.tf:3)
- [infra/ecr.tf](infra/ecr.tf:3)

Changed from:
```hcl
bucket = "${var.project_name}-frontend-${var.environment}"
```

To:
```hcl
bucket = "${var.project_name}-${data.aws_caller_identity.current.account_id}-frontend-${var.environment}"
```

This ensures:
- S3 buckets get globally unique names automatically
- ECR repository matches existing resource
- Other resources (ECS, ALB, IAM) keep simple names without account ID

## Verification

After changes, `terraform plan` shows:
- **15 to add**: New resources (autoscaling policies, lifecycle configs, missing configs)
- **27 to change**: Tag updates (adding "Team" = "Engineering")
- **0 to destroy**: ✅ No existing resources will be destroyed!

## What This Fixes

✅ Terraform now loads existing state from S3
✅ No "resource already exists" errors
✅ No resources will be destroyed/recreated
✅ Resource naming is consistent and matches existing infrastructure
✅ S3 buckets remain globally unique
✅ State locking works correctly

## Files Changed

1. **[infra/backend.tf](infra/backend.tf)** - Uncommented backend configuration with correct DynamoDB table name
2. **[infra/main.tf](infra/main.tf)** - Added `aws_caller_identity` data source
3. **[infra/terraform.tfvars](infra/terraform.tfvars)** - Set `project_name = "movies-app"`
4. **[infra/s3-frontend.tf](infra/s3-frontend.tf)** - Updated bucket name to include account ID
5. **[infra/s3-backend.tf](infra/s3-backend.tf)** - Updated bucket name to include account ID
6. **[infra/ecr.tf](infra/ecr.tf)** - Updated repository name to include account ID

## Next Steps

1. Commit these changes:
```bash
git add infra/
git commit -m "fix: Enable remote state backend and standardize resource naming

- Re-enabled S3 backend configuration with correct DynamoDB table
- Standardized project_name to 'movies-app' for consistency
- Added aws_caller_identity data source for account ID
- Updated S3 and ECR resources to include account ID for global uniqueness
- Fixes 'resource already exists' errors in CI/CD
- No resources will be destroyed (plan shows 0 to destroy)"
git push origin main
```

2. GitHub Actions workflow will now:
   - Initialize Terraform with remote backend
   - Load existing state from S3
   - Apply only necessary changes (new resources + tag updates)
   - No downtime or resource recreation

## Why This Works

The key insight is that the state file in S3 (`movies-app-212612999379-terraform-state/frontend/terraform.tfstate`) already contains all the existing resources. By:

1. **Enabling the backend configuration**: Terraform loads this existing state
2. **Matching the resource names**: Terraform code now generates the same names as what exists in AWS
3. **Using dynamic account ID**: Future-proof for different AWS accounts

This eliminates the state/reality mismatch that was causing the "already exists" errors.

## Lessons Learned

1. **Never disable backend without migration plan**: Commenting out backend causes state loss
2. **Consistent naming is critical**: Mixed naming conventions cause state drift
3. **Use data sources for dynamic values**: `data.aws_caller_identity.current.account_id` prevents hardcoding
4. **S3 bucket names need global uniqueness**: Always include account ID or random suffix
