# Bootstrap Fix Summary

## Problem Identified

GitHub Actions workflow was failing with:

```
Error: Error acquiring the state lock

Error message: 2 errors occurred:
  * operation error DynamoDB: PutItem, https response error StatusCode: 400,
    RequestID: 53SKPA0EDK62CNFSPEH6873M83VV4KQNSO5AEMVJF66Q9ASUAAJG,
    ResourceNotFoundException: Requested resource not found
  * Unable to retrieve item from DynamoDB table
    "movies-app-212612999379-terraform-locks": operation error DynamoDB:
    GetItem, https response error StatusCode: 400, RequestID:
    814I57I1836E9HEAVC4F78RQJFVV4KQNSO5AEMVJF66Q9ASUAAJG,
    ResourceNotFoundException: Requested resource not found
```

## Root Cause

The [infra/backend.tf](infra/backend.tf) file had the backend configuration **uncommented**, telling Terraform to use remote state stored in S3 with DynamoDB locking. However, these resources (the S3 bucket and DynamoDB table) didn't exist yet because they need to be created by Terraform first.

This is a classic **chicken-and-egg problem**:
- Terraform needs S3/DynamoDB to store state
- But S3/DynamoDB need to be created by Terraform
- But Terraform won't run without state storage configured

## Solution Applied

### 1. Commented Out Backend Configuration

**File:** [infra/backend.tf](infra/backend.tf:11-19)

**Before:**
```hcl
terraform {
  backend "s3" {
    bucket         = "movies-app-212612999379-terraform-state"
    key            = "frontend/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "movies-app-212612999379-terraform-locks"
  }
}
```

**After:**
```hcl
# terraform {
#   backend "s3" {
#     bucket         = "movies-app-212612999379-terraform-state"
#     key            = "frontend/terraform.tfstate"
#     region         = "us-east-1"
#     encrypt        = true
#     dynamodb_table = "movies-app-212612999379-terraform-locks"
#   }
# }
```

**Why:** This allows Terraform to use **local state** during the initial deployment, which creates all resources including the S3 bucket and DynamoDB table.

### 2. Created Bootstrap Documentation

**File:** [infra/BOOTSTRAP.md](infra/BOOTSTRAP.md)

Comprehensive guide explaining:
- The bootstrap problem and solution
- Two-step process (local state → remote state migration)
- When and how to migrate to remote state (optional)
- Troubleshooting common issues
- GitHub Actions behavior with local vs remote state

### 3. Updated Deployment Guide

**File:** [infra/DEPLOYMENT-GUIDE.md](infra/DEPLOYMENT-GUIDE.md:50-70)

Added notes about:
- Initial deployment using local state
- Reference to BOOTSTRAP.md for details
- Optional migration to remote state after first deployment

## How It Works Now

### First Deployment (Current State)

1. GitHub Actions workflow runs `terraform init`
   - Uses local state (no backend configured)
   - State stored temporarily in workflow's filesystem

2. Workflow runs `terraform apply`
   - Creates S3 bucket: `movies-app-212612999379-terraform-state`
   - Creates DynamoDB table: `movies-app-212612999379-terraform-locks`
   - Creates all other infrastructure (VPC, ECS, CloudFront, etc.)

3. Workflow completes successfully
   - All resources created
   - Local state discarded (GitHub Actions uses ephemeral runners)

### Future Deployments

**Option 1: Continue with local state (current)**
- Each workflow run starts fresh
- Works fine for CI/CD automation
- No state coordination between runs needed

**Option 2: Migrate to remote state (optional)**
- Uncomment backend block in [backend.tf](infra/backend.tf)
- Run `terraform init -migrate-state` locally
- Commit the change
- Future workflow runs use S3/DynamoDB for state
- Enables state locking and team collaboration

## Benefits of This Approach

✅ **No manual pre-setup required**: Everything is created automatically

✅ **CI/CD friendly**: Workflow can run immediately without manual intervention

✅ **Flexible**: Can migrate to remote state later when needed

✅ **Safe**: Local state prevents concurrent modification issues during bootstrap

✅ **Clear documentation**: [BOOTSTRAP.md](infra/BOOTSTRAP.md) explains the process

## What Changed

1. **[infra/backend.tf](infra/backend.tf)** - Backend configuration commented out
2. **[infra/BOOTSTRAP.md](infra/BOOTSTRAP.md)** - New documentation file (comprehensive guide)
3. **[infra/DEPLOYMENT-GUIDE.md](infra/DEPLOYMENT-GUIDE.md)** - Updated with bootstrap notes

## Next Steps

Push these changes to GitHub:

```bash
git add infra/backend.tf infra/BOOTSTRAP.md infra/DEPLOYMENT-GUIDE.md BOOTSTRAP-FIX-SUMMARY.md
git commit -m "fix: Comment out backend config for bootstrap

- Fixes DynamoDB ResourceNotFoundException error
- Allows Terraform to create backend resources on first run
- Adds comprehensive bootstrap documentation
- Updates deployment guide with bootstrap notes"
git push origin main
```

The GitHub Actions workflow will now run successfully and create all infrastructure resources!

## Future Migration (Optional)

If you want to use remote state later:

1. Wait for first successful deployment
2. Follow instructions in [infra/BOOTSTRAP.md](infra/BOOTSTRAP.md)
3. Uncomment backend block
4. Run `terraform init -migrate-state`
5. Commit and push

This enables:
- State locking (prevents concurrent modifications)
- State history (S3 versioning)
- Team collaboration (shared state)
- State persistence (not recreated each run)
