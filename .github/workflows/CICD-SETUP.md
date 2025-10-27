# CI/CD Setup Guide

Complete guide for setting up automated deployments with GitHub Actions.

## Overview

Three workflows are configured:

1. **`deploy-frontend.yml`** - Deploys React frontend to S3 + CloudFront
2. **`deploy-backend.yml`** - Builds and deploys backend to ECS
3. **`terraform.yml`** - Manages infrastructure with Terraform

## Initial Setup (One-Time)

### Step 1: Apply Infrastructure Manually First

**Important:** Run Terraform manually the first time to create all infrastructure:

```bash
cd infra
terraform init
terraform plan
terraform apply
```

This creates:
- Frontend: S3 + CloudFront
- Backend: VPC, ECS, ALB, ECR
- State management: S3 + DynamoDB

**Why manual first?**
- GitHub Actions needs the infrastructure to exist
- You need output values to configure GitHub variables
- Safer to review infrastructure changes manually first

### Step 2: Configure GitHub Secrets & Variables

Go to: **Repository → Settings → Secrets and variables → Actions**

#### Secrets (Encrypted)

Click **New repository secret**:

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

#### Variables (Plain Text)

Click **Variables tab → New repository variable**:

Get values from Terraform:
```bash
cd infra

# Frontend variables
terraform output frontend_bucket_name
terraform output cloudfront_distribution_id

# Backend variables
terraform output ecr_repository_name
terraform output ecs_cluster_name
terraform output ecs_service_name
terraform output alb_dns_name
```

Add these variables:

**Frontend:**
```
S3_BUCKET_NAME_PROD = movies-app-xxx-frontend-dev
CLOUDFRONT_DISTRIBUTION_ID_PROD = E1234ABCDEFG
```

**Backend:**
```
ECR_REPOSITORY_NAME_PROD = movies-app-xxx-backend-dev
ECS_CLUSTER_NAME_PROD = movies-app-xxx-cluster-dev
ECS_SERVICE_NAME_PROD = movies-app-xxx-backend-service-dev
ALB_NAME_PROD = movies-app-be-alb-dev
```

**Development (Optional):**
```
S3_BUCKET_NAME_DEV = <dev-bucket>
CLOUDFRONT_DISTRIBUTION_ID_DEV = <dev-cf-id>
ECR_REPOSITORY_NAME_DEV = <dev-ecr-repo>
ECS_CLUSTER_NAME_DEV = <dev-cluster>
ECS_SERVICE_NAME_DEV = <dev-service>
ALB_NAME_DEV = <dev-alb-name>
```

### Step 3: Quick Script to Get Values

```bash
cd infra

echo "=== GitHub Variables to Add ==="
echo ""
echo "Frontend:"
echo "S3_BUCKET_NAME_PROD=$(terraform output -raw frontend_bucket_name)"
echo "CLOUDFRONT_DISTRIBUTION_ID_PROD=$(terraform output -raw cloudfront_distribution_id)"
echo ""
echo "Backend:"
echo "ECR_REPOSITORY_NAME_PROD=$(terraform output -raw ecr_repository_name)"
echo "ECS_CLUSTER_NAME_PROD=$(terraform output -raw ecs_cluster_name)"
echo "ECS_SERVICE_NAME_PROD=$(terraform output -raw ecs_service_name)"
echo ""
echo "ALB Name (extract from URL):"
terraform output -raw alb_url | sed 's|http://||' | sed 's/-[0-9]*.*//'
```

## Workflows Explained

### 1. Frontend Deployment (`deploy-frontend.yml`)

**Triggers:**
- Push to `main` → Deploy to production
- Push to `develop` → Deploy to development
- Pull request to `main` → Build only (no deploy)
- Manual trigger

**What it does:**
1. Builds React app (`npm run build`)
2. Syncs `dist/` to S3
3. Invalidates CloudFront cache
4. Tests deployment

**Branch Strategy:**
- `main` branch = Production
- `develop` branch = Development

### 2. Backend Deployment (`deploy-backend.yml`)

**Triggers:**
- Push to `main` with changes in `server/` → Deploy to production
- Push to `develop` with changes in `server/` → Deploy to development
- Pull request → Build and test only
- Manual trigger (with custom image tag)

**What it does:**
1. Runs tests (`npm test`)
2. Builds TypeScript (`npm run build`)
3. Builds Docker image
4. Pushes to ECR
5. Updates ECS service (zero-downtime deployment)
6. Waits for service to stabilize
7. Tests health check endpoint

**Image Tagging:**
- Automatic: Uses git commit SHA (`${{ github.sha }}`)
- Manual: Can specify custom tag in workflow dispatch

### 3. Infrastructure (`terraform.yml`)

**Triggers:**
- Pull request with `infra/` changes → Run plan
- Push to `main` with `infra/` changes → Apply changes
- Manual trigger (choose plan or apply)

**What it does:**
1. Validates Terraform format
2. Runs `terraform plan`
3. On merge to main: Runs `terraform apply`
4. Comments plan on PR
5. Saves outputs

**Safety:**
- Always runs plan first
- Only applies on `main` branch
- Requires PR review before changes

## Workflows in Action

### Deploy Frontend

```bash
# Make changes to frontend
cd web
# ... make changes ...

git add .
git commit -m "feat: update frontend UI"
git push origin main
```

GitHub Actions will:
1. Build the app
2. Deploy to S3
3. Invalidate CloudFront
4. URL available in ~2 minutes

### Deploy Backend

```bash
# Make changes to backend
cd server
# ... make changes ...

git add .
git commit -m "feat: add new API endpoint"
git push origin main
```

GitHub Actions will:
1. Run tests
2. Build Docker image
3. Push to ECR
4. Deploy to ECS
5. Zero-downtime rolling update
6. API available in ~3-5 minutes

### Update Infrastructure

```bash
# Make changes to Terraform
cd infra
# ... make changes to .tf files ...

# Create PR first
git checkout -b infra-changes
git add .
git commit -m "infra: add RDS database"
git push origin infra-changes

# Create PR on GitHub
# Review the Terraform plan in PR comments
# Merge PR → Auto-applies changes
```

## Manual Triggers

All workflows can be manually triggered:

1. Go to **Actions** tab
2. Select workflow
3. Click **Run workflow**
4. Choose branch and options
5. Click **Run workflow**

**Backend manual deploy with custom tag:**
```
Workflow: Deploy Backend to ECS
Branch: main
Image tag: v1.0.0  (optional)
```

**Infrastructure manual run:**
```
Workflow: Terraform Infrastructure
Branch: main
Action: plan (or apply)
```

## Deployment Flow

### Recommended Flow for Production

1. **Create feature branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes, commit, push:**
   ```bash
   git add .
   git commit -m "feat: my feature"
   git push origin feature/my-feature
   ```

3. **Create Pull Request:**
   - GitHub Actions runs tests and builds
   - Reviews plan (for infra changes)
   - No deployment yet

4. **After PR approval, merge to main:**
   - Automatically deploys to production

5. **Monitor deployment:**
   - Check Actions tab for progress
   - View deployment summary
   - Test the deployed changes

## Environment Strategy

### Current Setup (Single Environment)

- `main` branch → Production
- Direct deployment to AWS

### Multi-Environment Setup (Recommended)

Use branches for environments:

- `develop` → Development environment
- `staging` → Staging environment
- `main` → Production environment

**To enable multi-environment:**

1. Create separate Terraform workspaces or configs for each environment
2. Add dev/staging variables to GitHub
3. Workflows already support this (see `deploy-dev` jobs)

## Monitoring Deployments

### View Logs

**GitHub Actions:**
- Go to Actions tab
- Click on workflow run
- View logs for each step

**Frontend:**
- CloudFront invalidation status in AWS Console

**Backend:**
- ECS service events in AWS Console
- CloudWatch logs: `/ecs/movies-app-backend-dev`

### Health Checks

All deployments automatically test health:

**Frontend:**
```bash
curl https://your-cloudfront-url.cloudfront.net
```

**Backend:**
```bash
curl http://your-alb-url.amazonaws.com/api/heartbeat
```

## Rollback Procedures

### Rollback Frontend

Option 1: Revert commit and push
```bash
git revert HEAD
git push origin main
```

Option 2: Manual rollback
```bash
cd web
git checkout HEAD~1
npm run build
aws s3 sync dist/ s3://your-bucket --delete
```

### Rollback Backend

Option 1: Deploy previous image
```bash
# Get previous image tag
aws ecr list-images --repository-name your-repo

# Manual trigger workflow with previous tag
# Or use CLI:
aws ecs update-service \
  --cluster your-cluster \
  --service your-service \
  --task-definition your-task:previous-version
```

Option 2: ECS automatic rollback
- ECS has circuit breaker enabled
- Automatically rolls back on failed health checks

### Rollback Infrastructure

```bash
cd infra
git revert HEAD
git push origin main
# Auto-applies reverted changes
```

## Troubleshooting

### Workflow Fails: AWS Credentials

**Error:** `Error: Could not assume role`

**Fix:**
1. Check AWS credentials in GitHub Secrets
2. Verify IAM permissions
3. Check credential expiration

### Frontend Deploy Fails

**Error:** `Access Denied to S3`

**Fix:**
1. Verify `S3_BUCKET_NAME_PROD` matches exactly
2. Check IAM policy allows S3 operations
3. Ensure bucket exists

### Backend Deploy Fails

**Error:** `Service failed to stabilize`

**Fix:**
1. Check CloudWatch logs for container errors
2. Verify health check endpoint works
3. Check security groups allow ALB → ECS traffic
4. Increase `health_check_grace_period_seconds`

### Infrastructure Apply Fails

**Error:** `State locked`

**Fix:**
```bash
cd infra
terraform force-unlock <LOCK_ID>
```

### Docker Build Fails

**Error:** `npm install failed`

**Fix:**
1. Check `package-lock.json` is committed
2. Verify Node version matches Dockerfile
3. Check for dependency issues

## Security Best Practices

- ✅ Use GitHub Secrets for credentials
- ✅ Use GitHub Environments for production approvals
- ✅ Enable branch protection on `main`
- ✅ Require PR reviews before merge
- ✅ Use minimal IAM permissions
- ✅ Rotate AWS keys regularly
- ✅ Enable 2FA on GitHub
- ✅ Review workflow logs after deployment

## Cost Optimization

### GitHub Actions Minutes

- **Free tier:** 2,000 minutes/month
- **Frontend deploy:** ~2 min
- **Backend deploy:** ~5 min
- **Terraform plan:** ~1 min

### Reduce Costs

1. **Cache dependencies:**
   - Already enabled in workflows
   - Saves ~30 seconds per build

2. **Skip workflows when not needed:**
   - Path filters already configured
   - Only triggers on relevant changes

3. **Use self-hosted runners (advanced):**
   - For unlimited minutes
   - Requires infrastructure setup

## Next Steps

- [ ] Test all workflows by pushing changes
- [ ] Set up GitHub Environments for production approval
- [ ] Configure Slack/Discord notifications
- [ ] Add more comprehensive tests
- [ ] Set up monitoring and alerting
- [ ] Create staging environment
- [ ] Add database migrations workflow
- [ ] Implement blue-green deployments

## Quick Reference

### Get Current Deployment Status

```bash
# Frontend
curl https://$(cd infra && terraform output -raw cloudfront_domain_name)

# Backend
curl $(cd infra && terraform output -raw alb_url)/api/heartbeat
```

### Force Redeploy

Trigger workflow manually or:

```bash
# Frontend
git commit --allow-empty -m "trigger: redeploy frontend"
git push origin main

# Backend
git commit --allow-empty -m "trigger: redeploy backend"
git push origin main
```

### View Deployment History

- GitHub: **Actions** tab
- AWS: **ECS → Services → Deployments**
- CloudWatch: **Logs** for backend logs

## Support

- GitHub Actions Docs: https://docs.github.com/actions
- AWS ECS Docs: https://docs.aws.amazon.com/ecs/
- Terraform Docs: https://www.terraform.io/docs
