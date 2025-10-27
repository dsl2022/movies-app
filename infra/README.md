# Movies App Infrastructure

This directory contains Terraform configuration for deploying the movies app frontend to AWS using S3 and CloudFront.

## Resources Created

### Frontend Infrastructure
- **S3 Bucket**: Hosts the static frontend build files
- **CloudFront Distribution**: CDN for fast global content delivery
- **Origin Access Control (OAC)**: Secure access from CloudFront to S3
- **Custom Domain Support**: Optional custom domain with ACM certificate

### Backend Infrastructure (Terraform State)
- **S3 Bucket**: Stores Terraform state files
- **DynamoDB Table**: Provides state locking to prevent concurrent modifications
- **Versioning**: Enabled for state recovery

## Prerequisites

1. **AWS CLI** installed and configured
   ```bash
   aws configure
   ```

2. **Terraform** installed (>= 1.0)
   ```bash
   brew install terraform  # macOS
   ```

3. **AWS Credentials** with permissions to create:
   - S3 buckets
   - CloudFront distributions
   - DynamoDB tables
   - IAM policies

## Quick Start

### 1. Initialize Configuration

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your settings:
```hcl
aws_region   = "us-east-1"
environment  = "dev"
project_name = "movies-app"
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review Changes

```bash
terraform plan
```

### 4. Deploy Infrastructure

```bash
terraform apply
```

Review the plan and type `yes` to confirm.

### 5. Get Outputs

```bash
terraform output
```

You'll see:
- Frontend bucket name
- CloudFront distribution ID
- CloudFront URL (your app will be accessible here)
- Terraform state bucket details

## Deploying Frontend

After infrastructure is created, deploy your React app:

```bash
# Build the frontend
cd ../web
npm run build

# Sync to S3
aws s3 sync dist/ s3://$(terraform -chdir=../infra output -raw frontend_bucket_name) --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(terraform -chdir=../infra output -raw cloudfront_distribution_id) \
  --paths "/*"
```

## Using Remote State Backend

After the first `terraform apply`, you can migrate to remote state:

1. Uncomment the backend configuration in [main.tf](main.tf):
   ```hcl
   backend "s3" {
     bucket         = "movies-app-terraform-state"
     key            = "frontend/terraform.tfstate"
     region         = "us-east-1"
     encrypt        = true
     dynamodb_table = "movies-app-terraform-locks"
   }
   ```

2. Update the bucket name to match your output:
   ```bash
   terraform output terraform_state_bucket_name
   ```

3. Migrate the state:
   ```bash
   terraform init -migrate-state
   ```

## Custom Domain Setup

To use a custom domain (e.g., `movies.example.com`):

1. **Create ACM Certificate** in `us-east-1`:
   ```bash
   aws acm request-certificate \
     --domain-name movies.example.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate the certificate** via DNS

3. **Update terraform.tfvars**:
   ```hcl
   domain_name = "movies.example.com"
   acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx"
   ```

4. **Apply changes**:
   ```bash
   terraform apply
   ```

5. **Update DNS** to point to CloudFront:
   ```
   movies.example.com CNAME xxxx.cloudfront.net
   ```

## Environment Management

Deploy multiple environments by using workspaces or separate state files:

### Using Workspaces
```bash
terraform workspace new staging
terraform workspace new prod
terraform workspace select dev
```

### Using Separate Directories
```
infra/
├── dev/
├── staging/
└── prod/
```

## Architecture

```
User → CloudFront (CDN) → S3 Bucket (Static Files)
                ↓
         Origin Access Control
         (Secure S3 Access)
```

### Security Features
- S3 bucket is private (no public access)
- CloudFront uses Origin Access Control (OAC)
- HTTPS enforcement
- Server-side encryption enabled
- Versioning enabled for recovery

### Performance Features
- CloudFront caching (default 1 hour)
- Long cache for static assets (1 year)
- Gzip/Brotli compression
- IPv6 support
- SPA routing support (404/403 → index.html)

## Useful Commands

```bash
# Check current state
terraform show

# List all resources
terraform state list

# Format configuration
terraform fmt

# Validate configuration
terraform validate

# Destroy all resources (careful!)
terraform destroy

# Get specific output
terraform output cloudfront_url

# Refresh outputs without changes
terraform refresh
```

## Cost Estimation

**Monthly costs** (approximate):
- S3 storage: ~$0.023 per GB
- CloudFront: ~$0.085 per GB (first 10TB)
- DynamoDB (on-demand): ~$0 (minimal state locking)
- Total for small app: **< $5/month**

## Troubleshooting

### CloudFront shows 403 error
- Wait 10-15 minutes for distribution to deploy
- Ensure S3 bucket policy is correct
- Check that files are uploaded to S3

### SPA routing not working
- CloudFront custom error responses are configured
- Ensure `default_root_object = "index.html"`

### State locking errors
- Check DynamoDB table exists
- Verify AWS credentials have DynamoDB permissions

## Next Steps

1. Set up CI/CD pipeline for automatic deployments
2. Add CloudWatch alarms for monitoring
3. Configure WAF for security
4. Add multiple environments (staging, prod)
5. Set up DNS and custom domain

## Documentation

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [CloudFront Docs](https://docs.aws.amazon.com/cloudfront/)
- [S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
