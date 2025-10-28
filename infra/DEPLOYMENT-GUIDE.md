# Complete Deployment Guide

End-to-end guide for deploying the Movies App (Frontend + Backend) to AWS.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet Users                           │
└────────────┬────────────────────────────────────┬───────────────┘
             │                                     │
             ▼                                     ▼
    ┌─────────────────┐                  ┌─────────────────┐
    │   CloudFront    │                  │      ALB        │
    │   (Frontend)    │                  │   (Backend)     │
    └────────┬────────┘                  └────────┬────────┘
             │                                     │
             ▼                                     ▼
    ┌─────────────────┐                  ┌─────────────────┐
    │   S3 Bucket     │                  │   ECS Fargate   │
    │  (Static Files) │                  │   (Containers)  │
    └─────────────────┘                  └─────────────────┘
```

## Prerequisites

- [x] AWS Account with programmatic access
- [x] AWS CLI installed and configured
- [x] Terraform >= 1.0
- [x] Docker installed
- [x] Node.js 20+ installed
- [x] Git repository

## Step 1: Configure Terraform Variables

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
aws_region   = "us-east-1"
environment  = "dev"
project_name = "movies-app-<YOUR-ACCOUNT-ID>"  # Make it unique!
```

## Step 2: Deploy Infrastructure

**Important:** The first deployment uses local state to bootstrap the remote state infrastructure. See [BOOTSTRAP.md](BOOTSTRAP.md) for details.

```bash
cd infra

# Initialize Terraform
terraform init

# Review what will be created
terraform plan

# Deploy everything
terraform apply
```

This creates:
- **Frontend**: S3 bucket + CloudFront distribution
- **Backend**: VPC, ECS cluster, ALB, ECR repository
- **State Management**: S3 bucket + DynamoDB table

**Note:** The backend block in [backend.tf](backend.tf) is commented out for the initial bootstrap. After the first successful deployment, you can optionally migrate to remote state. See [BOOTSTRAP.md](BOOTSTRAP.md) for migration instructions.

**Time:** ~5-10 minutes

**Cost:** ~$95-110/month for dev environment

## Step 3: Deploy Frontend

### Option A: Using AWS CLI (Manual)

```bash
# Build frontend
cd ../web
npm install
npm run build

# Get bucket name from Terraform
cd ../infra
S3_BUCKET=$(terraform output -raw frontend_bucket_name)
CF_DIST=$(terraform output -raw cloudfront_distribution_id)

# Upload to S3
aws s3 sync ../web/dist/ s3://$S3_BUCKET --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $CF_DIST --paths "/*"
```

### Option B: Using GitHub Actions (Automated)

See [GitHub Actions Setup](#github-actions-setup) below.

## Step 4: Deploy Backend

```bash
cd ../server

# Build and deploy (uses deploy.sh script)
./deploy.sh

# Or with specific version tag
./deploy.sh v1.0.0
```

The script will:
1. Login to ECR
2. Build Docker image
3. Push to ECR
4. Update ECS service
5. Wait for deployment

**Time:** ~3-5 minutes

## Step 5: Verify Deployment

### Test Frontend

```bash
cd ../infra
FRONTEND_URL=$(terraform output -raw cloudfront_url)
echo "Frontend: $FRONTEND_URL"

# Open in browser
open $FRONTEND_URL  # macOS
# or
xdg-open $FRONTEND_URL  # Linux
```

### Test Backend

```bash
BACKEND_URL=$(terraform output -raw alb_url)
echo "Backend: $BACKEND_URL"

# Test health check
curl $BACKEND_URL/api/heartbeat

# Expected output:
# {"ok":true,"service":"movie-api-backend"}
```

## Step 6: Connect Frontend to Backend

Update your frontend to use the backend URL:

```bash
# Get backend URL
cd infra
terraform output alb_url
```

Update `web/.env` or `web/src/config.ts`:
```javascript
export const API_URL = 'http://movies-app-backend-alb-dev-xxxxx.us-east-1.elb.amazonaws.com'
```

Rebuild and redeploy frontend:
```bash
cd ../web
npm run build
aws s3 sync dist/ s3://$(cd ../infra && terraform output -raw frontend_bucket_name) --delete
aws cloudfront create-invalidation --distribution-id $(cd ../infra && terraform output -raw cloudfront_distribution_id) --paths "/*"
```

## GitHub Actions Setup

Automate deployments with GitHub Actions.

### 1. Add AWS Credentials to GitHub

**Repository → Settings → Secrets and variables → Actions**

**Secrets** (encrypted):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

**Variables** (plain text):
```bash
# Get these from Terraform
cd infra
terraform output frontend_bucket_name
terraform output cloudfront_distribution_id
```

Add to GitHub:
- `S3_BUCKET_NAME_PROD` = `movies-app-xxx-frontend-dev`
- `CLOUDFRONT_DISTRIBUTION_ID_PROD` = `E1234ABCDEFG`

### 2. Push Changes

```bash
git add .
git commit -m "feat: add infrastructure"
git push origin main
```

Frontend will automatically deploy when `web/` files change!

## Outputs Reference

Get all outputs:
```bash
cd infra
terraform output
```

### Frontend Outputs
- `cloudfront_url` - Your frontend URL
- `cloudfront_distribution_id` - For cache invalidation
- `frontend_bucket_name` - S3 bucket name

### Backend Outputs
- `alb_url` - Your backend API URL
- `ecr_repository_url` - Docker registry URL
- `ecs_cluster_name` - ECS cluster name
- `ecs_service_name` - ECS service name

### Infrastructure Outputs
- `vpc_id` - VPC identifier
- `private_subnet_ids` - Private subnet IDs
- `public_subnet_ids` - Public subnet IDs

## Common Tasks

### Update Backend Code

```bash
cd server
./deploy.sh
```

### Update Frontend Code

```bash
cd web
npm run build

cd ../infra
aws s3 sync ../web/dist/ s3://$(terraform output -raw frontend_bucket_name) --delete
aws cloudfront create-invalidation --distribution-id $(terraform output -raw cloudfront_distribution_id) --paths "/*"
```

### Scale Backend

Edit `infra/terraform.tfvars`:
```hcl
backend_desired_count = 2  # Run 2 tasks
```

Apply changes:
```bash
cd infra
terraform apply
```

### View Backend Logs

```bash
aws logs tail "/ecs/movies-app-backend-dev" --follow
```

### Stop Backend (Save Costs)

```bash
cd infra
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service $(terraform output -raw ecs_service_name) \
  --desired-count 0
```

### Start Backend

```bash
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service $(terraform output -raw ecs_service_name) \
  --desired-count 1
```

## Troubleshooting

### Frontend: "NoSuchKey" error

CloudFront is trying to access S3 before files are uploaded.

**Solution:** Deploy frontend after infrastructure is ready.

### Frontend: Old version showing

CloudFront cache not invalidated.

**Solution:**
```bash
cd infra
aws cloudfront create-invalidation --distribution-id $(terraform output -raw cloudfront_distribution_id) --paths "/*"
```

### Backend: Service fails to start

Check logs:
```bash
aws logs tail "/ecs/movies-app-backend-dev" --follow
```

Common issues:
- No Docker image in ECR → Run `./deploy.sh`
- Health check failing → Verify `/api/heartbeat` endpoint
- Port mismatch → Check `backend_port` in terraform.tfvars

### Backend: Can't access ALB URL

- Wait 2-3 minutes for ALB to become active
- Check security groups allow port 80
- Verify ECS tasks are running:
  ```bash
  cd infra
  aws ecs list-tasks --cluster $(terraform output -raw ecs_cluster_name)
  ```

### Terraform: State locked

Someone else is running terraform or previous run crashed.

**Solution:**
```bash
# Force unlock (use carefully!)
terraform force-unlock <LOCK_ID>
```

## Cost Management

### Current Monthly Costs (~$95-110)

- **Frontend**:
  - S3: ~$1
  - CloudFront: ~$1-5 (depends on traffic)

- **Backend**:
  - ECS Fargate (1 task): ~$10
  - ALB: ~$16
  - NAT Gateways (2): ~$64
  - ECR: ~$1
  - CloudWatch: ~$1

### Cost Optimization for Dev

1. **Single NAT Gateway** (-$32/month)
   - Edit `infra/vpc.tf`, create only 1 NAT Gateway
   - Use same NAT for both AZs

2. **Use Fargate Spot** (-70% compute)
   - Edit `infra/ecs.tf`, use FARGATE_SPOT capacity provider

3. **Stop backend when not in use** (-$10/month when stopped)
   ```bash
   aws ecs update-service --cluster $CLUSTER --service $SERVICE --desired-count 0
   ```

4. **Reduce log retention** (minimal savings)
   - Edit `infra/ecs.tf`, change retention to 1 day

## Security Checklist

- [x] S3 buckets are private
- [x] CloudFront uses OAC for S3 access
- [x] ECS tasks run in private subnets
- [x] Security groups properly configured
- [x] IAM roles follow least privilege
- [x] Encryption enabled (S3, ECR, logs)
- [x] Container runs as non-root user
- [x] ECR image scanning enabled

## Production Readiness

Before going to production:

- [ ] Set up custom domains (frontend + backend)
- [ ] Configure HTTPS/SSL certificates (ACM)
- [ ] Add WAF for security
- [ ] Set up CloudWatch alarms
- [ ] Configure automated backups
- [ ] Add RDS database (if needed)
- [ ] Set up separate environments (dev/staging/prod)
- [ ] Configure CI/CD pipeline
- [ ] Add monitoring and alerting
- [ ] Document runbook for incidents
- [ ] Perform load testing
- [ ] Set up DR (Disaster Recovery) plan

## Multi-Environment Setup

### Option 1: Terraform Workspaces

```bash
cd infra

# Create workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# Switch between environments
terraform workspace select prod
terraform apply
```

### Option 2: Separate State Files

```bash
# Use different backend keys
terraform init -backend-config="key=dev/terraform.tfstate"
terraform init -backend-config="key=prod/terraform.tfstate"
```

## Cleanup / Destroy

To remove all resources:

```bash
cd infra

# Preview what will be destroyed
terraform plan -destroy

# Destroy everything
terraform destroy
```

**Warning:** This will delete:
- All S3 buckets (including frontend files)
- CloudFront distribution
- ECS cluster and tasks
- VPC and networking
- ECR repository (and all images)
- CloudWatch logs

## Getting Help

### Documentation
- [Frontend README](../web/README.md)
- [Backend README](BACKEND-README.md)
- [GitHub Actions Setup](.github/workflows/README.md)

### AWS Documentation
- [ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

### Common Commands

```bash
# Terraform
terraform init          # Initialize
terraform plan          # Preview changes
terraform apply         # Apply changes
terraform output        # Show outputs
terraform destroy       # Destroy everything

# Frontend Deploy
cd web && npm run build
aws s3 sync dist/ s3://$BUCKET --delete
aws cloudfront create-invalidation --distribution-id $ID --paths "/*"

# Backend Deploy
cd server && ./deploy.sh

# View Logs
aws logs tail "/ecs/movies-app-backend-dev" --follow

# Check ECS Status
aws ecs describe-services --cluster $CLUSTER --services $SERVICE
```

## Next Steps

1. ✅ Infrastructure deployed
2. ✅ Frontend deployed
3. ✅ Backend deployed
4. → Connect frontend to backend API
5. → Set up custom domains
6. → Configure CI/CD
7. → Add monitoring and alerts
8. → Perform load testing
9. → Deploy to production

Happy deploying! 🚀
