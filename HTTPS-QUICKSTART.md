# HTTPS Quick Start Guide

## Problem
Mixed content error: CloudFront (HTTPS) → ALB (HTTP) is blocked by browsers.

## Solution Options

### Option 1: Quick Fix (For Testing) - Use HTTP CloudFront
Access your site via HTTP instead of HTTPS:
```
http://dwkpann1b246g.cloudfront.net
```

**Pros:** Works immediately
**Cons:** Not secure, not production-ready

### Option 2: Enable HTTPS on ALB (Recommended)

**Requirements:**
- A domain name (e.g., api.yourdomain.com)
- Cost: ~$12/year for domain

**Steps:**

#### 1. Get ACM Certificate

```bash
# Request certificate
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region us-east-1

# Save the CertificateArn from output
```

#### 2. Validate Certificate
- Go to AWS Console → Certificate Manager
- Click certificate → Create DNS records
- Wait for "Issued" status (~5-30 min)

#### 3. Update Terraform

Edit `infra/terraform.tfvars`:
```hcl
enable_backend_https = true
backend_certificate_arn = "arn:aws:acm:us-east-1:xxx:certificate/xxx"
```

#### 4. Apply Changes
```bash
cd infra
terraform apply
```

#### 5. Create DNS Record
Point your domain to ALB:
```
api.yourdomain.com → CNAME → movies-app-2126-be-alb-dev-xxx.us-east-1.elb.amazonaws.com
```

#### 6. Update Frontend
```bash
# Update .env.production
echo "VITE_API_BASE=https://api.yourdomain.com/api" > web/.env.production

# Update GitHub variable
# BACKEND_API_URL=https://api.yourdomain.com/api
```

#### 7. Redeploy Frontend
```bash
cd web
npm run build
aws s3 sync dist/ s3://movies-app-212612999379-frontend-dev --delete
aws cloudfront create-invalidation --distribution-id E2VBVV3DYB27IM --paths "/*"
```

## Current Status

✅ HTTPS infrastructure code added
✅ Variables configured
✅ CloudFront back to HTTPS-only
⏳ Waiting for: ACM certificate setup

## Files Modified

- `infra/alb.tf` - Added HTTPS listener
- `infra/backend-variables.tf` - Added HTTPS variables
- `infra/cloudfront.tf` - Reverted to HTTPS
- `infra/outputs.tf` - Added HTTPS URL output
- `infra/acm-backend.tf` - ACM certificate placeholder
- `infra/HTTPS-SETUP.md` - Detailed setup guide

## Test After Setup

```bash
# Test HTTP (should redirect to HTTPS)
curl -I http://api.yourdomain.com/api/heartbeat

# Test HTTPS
curl https://api.yourdomain.com/api/heartbeat

# Test from frontend
open https://dwkpann1b246g.cloudfront.net
```

See [HTTPS-SETUP.md](infra/HTTPS-SETUP.md) for detailed instructions.
