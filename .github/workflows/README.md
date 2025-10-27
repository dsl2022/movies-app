# GitHub Actions CI/CD Setup

This directory contains GitHub Actions workflows for automated deployment.

## Workflows

### `deploy-frontend.yml`

Automatically builds and deploys the frontend to AWS S3 + CloudFront when changes are pushed.

**Triggers:**
- Push to `main` branch → Deploys to **Production**
- Push to `develop` branch → Deploys to **Development**
- Pull requests to `main` → Runs build only (no deployment)
- Manual trigger via GitHub UI

**Jobs:**
1. **Build** - Builds the React app
2. **Deploy Dev** - Deploys to development environment (develop branch)
3. **Deploy Prod** - Deploys to production environment (main branch)

## Setup Instructions

### 1. Configure AWS IAM User

Create an IAM user with programmatic access and attach this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::movies-app-*-frontend-*",
        "arn:aws:s3:::movies-app-*-frontend-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetDistribution",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. Add GitHub Secrets

Go to: **Repository → Settings → Secrets and variables → Actions**

**Secrets** (encrypted):
- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key

**Variables** (plain text):
- `S3_BUCKET_NAME_DEV` - Development S3 bucket name
- `S3_BUCKET_NAME_PROD` - Production S3 bucket name
- `CLOUDFRONT_DISTRIBUTION_ID_DEV` - Development CloudFront ID
- `CLOUDFRONT_DISTRIBUTION_ID_PROD` - Production CloudFront ID

### 3. Get Values from Terraform

After running `terraform apply`, get these values:

```bash
cd infra

# Get bucket names and CloudFront IDs
terraform output frontend_bucket_name
terraform output cloudfront_distribution_id
```

### 4. Configure GitHub Environments (Optional but Recommended)

Go to: **Repository → Settings → Environments**

Create two environments:
- **development**
- **production** (add protection rules like required approvals)

## Getting Terraform Output Values

Run this script to get all values for GitHub:

```bash
cd infra

echo "GitHub Secrets (encrypt these):"
echo "--------------------------------"
echo "AWS_ACCESS_KEY_ID=<your-access-key>"
echo "AWS_SECRET_ACCESS_KEY=<your-secret-key>"
echo ""
echo "GitHub Variables (plain text):"
echo "--------------------------------"
echo "S3_BUCKET_NAME_PROD=$(terraform output -raw frontend_bucket_name)"
echo "CLOUDFRONT_DISTRIBUTION_ID_PROD=$(terraform output -raw cloudfront_distribution_id)"
echo ""
echo "For development, create a separate Terraform workspace or configuration"
```

## Workflow Features

### Smart Caching
- Static assets (JS, CSS, images): cached for 1 hour
- HTML/JSON files: cached for 5 minutes with revalidation
- Ensures users get updates quickly while maintaining performance

### CloudFront Invalidation
- Automatically invalidates the entire CloudFront cache after deployment
- Users see new changes immediately without waiting for TTL expiration

### Build Artifacts
- Build artifacts are saved for 7 days
- Enables debugging and rollback if needed

### Path-based Triggers
- Only triggers when files in `web/` directory change
- Saves build minutes and resources

## Manual Deployment

You can manually trigger deployment from GitHub:

1. Go to **Actions** tab
2. Select **Deploy Frontend to AWS**
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

## Monitoring

### View Deployment Status

Go to: **Actions** tab to see:
- Build logs
- Deployment progress
- CloudFront URLs
- Error messages (if any)

### Deployment Summary

After each production deployment, a summary appears showing:
- Environment deployed to
- CloudFront URL
- Commit SHA

## Troubleshooting

### Build fails with "npm ci" error
- Delete `package-lock.json` and regenerate it
- Ensure dependencies are compatible

### Deployment fails with "Access Denied"
- Check AWS credentials are correct
- Verify IAM policy permissions
- Check S3 bucket name matches exactly

### CloudFront invalidation fails
- Verify CloudFront distribution ID is correct
- Check IAM policy includes CloudFront permissions
- Previous invalidation might still be in progress (wait a few minutes)

### Changes not appearing
- CloudFront invalidation takes 1-2 minutes
- Check browser cache (hard refresh: Cmd+Shift+R / Ctrl+Shift+R)
- Verify deployment succeeded in Actions tab

## Multi-Environment Setup

To deploy to multiple environments (dev, staging, prod):

### Option 1: Use Branches
- `develop` → dev environment
- `staging` → staging environment
- `main` → production environment

### Option 2: Use Terraform Workspaces
```bash
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod
```

Then create separate variable sets for each environment.

## Cost Optimization

### GitHub Actions Minutes
- Free tier: 2,000 minutes/month
- Each deployment uses ~2-3 minutes
- Estimated: ~60 deployments/month on free tier

### AWS Costs
- S3 sync only uploads changed files
- CloudFront invalidation: First 1,000 paths free/month
- Using `--delete` flag removes unused files, saving storage

## Security Best Practices

- ✅ Use GitHub Secrets for AWS credentials
- ✅ Use IAM user with minimal permissions (not root)
- ✅ Enable branch protection on `main`
- ✅ Require PR reviews before merging
- ✅ Use GitHub Environments for production approvals
- ✅ Rotate AWS keys regularly

## Next Steps

- [ ] Add automated tests before deployment
- [ ] Set up separate dev/staging environments
- [ ] Add Slack/Discord notifications
- [ ] Implement blue-green deployments
- [ ] Add rollback workflow
- [ ] Monitor with CloudWatch alarms
