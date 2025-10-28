# Terraform Bootstrap Guide

## Problem

Terraform needs an S3 bucket and DynamoDB table to store remote state, but these resources need to be created by Terraform first. This creates a chicken-and-egg problem.

## Solution: Two-Step Bootstrap Process

### Step 1: Create Backend Resources with Local State

The backend configuration is currently commented out in [backend.tf](backend.tf). This allows Terraform to use local state while creating the S3 bucket and DynamoDB table.

**What happens in this step:**
- Terraform runs with local state (stored in `terraform.tfstate` file)
- Creates the S3 bucket: `movies-app-212612999379-terraform-state`
- Creates the DynamoDB table: `movies-app-212612999379-terraform-locks`
- Creates all other infrastructure (CloudFront, ECS, VPC, etc.)

**To run this step:**

The GitHub Actions workflow will automatically handle this when you push to main:

```bash
git add infra/backend.tf
git commit -m "Fix: Comment out backend config for bootstrap"
git push origin main
```

The workflow will:
1. Run `terraform init` (uses local state)
2. Run `terraform apply` (creates all resources including backend S3/DynamoDB)

### Step 2: Migrate to Remote State

After the backend resources are created, you can migrate to remote state.

**Manual steps (optional, for future state management):**

1. Uncomment the backend block in [backend.tf](backend.tf:11-19):

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

2. Re-initialize Terraform to migrate state:

```bash
cd infra
terraform init -migrate-state
```

3. Terraform will prompt:

```
Do you want to copy existing state to the new backend?
  Pre-existing state was found while migrating the previous "local" backend to the
  newly configured "s3" backend. No existing state was found in the newly
  configured "s3" backend. Do you want to copy this state to the new "s3"
  backend? Enter "yes" to copy and "no" to start with an empty state.

  Enter a value: yes
```

4. Commit the change:

```bash
git add backend.tf
git commit -m "Enable remote state backend"
git push origin main
```

## Current State

✅ **Step 1 is ready**: The backend configuration is commented out, allowing the workflow to run successfully and create all resources.

⏳ **Step 2 is optional**: You can migrate to remote state later if you want to:
- Enable team collaboration (multiple people can run terraform)
- Enable state locking (prevents concurrent modifications)
- Enable state versioning (rollback capability)

## Why Use Remote State?

**Benefits:**
- **Team collaboration**: Multiple developers can work on infrastructure
- **State locking**: DynamoDB prevents concurrent modifications
- **State history**: S3 versioning allows rollback to previous states
- **Security**: State stored in encrypted S3 instead of local filesystem
- **CI/CD friendly**: GitHub Actions can access centralized state

**When to migrate:**
- After first successful deployment
- Before adding team members
- Before making production-critical changes

## Troubleshooting

### Error: "Requested resource not found" (DynamoDB)

This means you tried to use remote state before creating the backend resources.

**Fix:** Ensure [backend.tf](backend.tf) backend block is commented out (current state).

### Error: "Backend initialization required"

After uncommenting the backend block, you must run `terraform init -migrate-state`.

### Error: "State file locked"

Someone else is running terraform, or a previous run didn't complete. Check DynamoDB table for lock entry.

## GitHub Actions Behavior

The workflow in [.github/workflows/terraform.yml](../.github/workflows/terraform.yml) will:

1. **First run** (backend commented):
   - Use local state
   - Create all resources including S3/DynamoDB
   - Store state in workflow's local filesystem (ephemeral)

2. **After migrating** (backend uncommented):
   - Use remote state from S3
   - Lock state using DynamoDB
   - Multiple workflows can coordinate through locking

**Note:** Until you migrate to remote state, each workflow run will start fresh since local state is not persisted between runs. This is fine for the initial bootstrap.
