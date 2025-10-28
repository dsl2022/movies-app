# HTTPS Setup for Backend ALB

This guide explains how to enable HTTPS on your backend ALB to avoid mixed content errors.

## Problem

CloudFront serves frontend over HTTPS, but ALB serves backend over HTTP. Browsers block this "mixed content" for security.

## Solution: Add HTTPS to ALB

### Option 1: Use ACM Certificate with Custom Domain (Recommended)

This is the proper production solution.

#### Step 1: Get a Domain Name

You need a domain name (e.g., `api.yourdomain.com`). You can:
- Buy one from Route53, Namecheap, GoDaddy, etc.
- Use a subdomain of an existing domain

#### Step 2: Request ACM Certificate

```bash
# Request certificate for your backend domain
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region us-east-1

# Note the CertificateArn from output
```

#### Step 3: Validate Certificate

1. Go to **AWS Console → Certificate Manager**
2. Click on your certificate
3. Click **Create records in Route 53** (if using Route53)
4. Or manually add the CNAME record to your DNS provider
5. Wait for status to change to **Issued** (~5-30 minutes)

#### Step 4: Update Terraform Variables

Edit `infra/terraform.tfvars`:

```hcl
# Enable HTTPS
enable_backend_https = true

# Add your certificate ARN
backend_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx-xxxx-xxxx"

# Redirect HTTP to HTTPS
redirect_http_to_https = true
```

#### Step 5: Apply Terraform

```bash
cd infra
terraform plan
terraform apply
```

#### Step 6: Create DNS Record for ALB

Point your domain to the ALB:

```bash
# Get ALB DNS name
cd infra
terraform output alb_dns_name
```

Create a CNAME record in your DNS:
```
api.yourdomain.com  →  CNAME  →  movies-app-2126-be-alb-dev-xxxxx.us-east-1.elb.amazonaws.com
```

Or use Route53 Alias record (better):
```bash
# If using Route53, create alias record pointing to ALB
```

#### Step 7: Update Frontend to Use HTTPS URL

Update `web/.env.production`:
```bash
VITE_API_BASE=https://api.yourdomain.com/api
```

Update GitHub variable:
```
BACKEND_API_URL=https://api.yourdomain.com/api
```

#### Step 8: Redeploy Frontend

```bash
cd web
npm run build

# Deploy to S3
aws s3 sync dist/ s3://movies-app-212612999379-frontend-dev --delete
aws cloudfront create-invalidation --distribution-id E2VBVV3DYB27IM --paths "/*"
```

### Option 2: Use Self-Signed Certificate (Testing Only)

**⚠️ Not recommended for production** - Browsers will show security warnings.

#### Step 1: Import Self-Signed Certificate to ACM

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout private.key \
  -out certificate.crt \
  -subj "/C=US/ST=State/L=City/O=Org/CN=*.elb.amazonaws.com"

# Import to ACM
aws acm import-certificate \
  --certificate fileb://certificate.crt \
  --private-key fileb://private.key \
  --region us-east-1
```

#### Step 2: Update Terraform (same as Option 1, Step 4-8)

### Option 3: Use AWS Certificate Manager with ALB DNS (Workaround)

ACM certificates require a domain name, so you can't use the ALB DNS directly. However, you can:

1. **Request a certificate for a wildcard subdomain you control**
2. **Use CloudFront as a proxy** (more complex)

## Current Temporary Solution

For now, the infrastructure allows HTTP access to work around the issue:

```bash
# Access via HTTP (not HTTPS)
http://dwkpann1b246g.cloudfront.net/genre/Action
```

This works but is not secure for production.

## Quick Setup Script

If you have a domain, run this:

```bash
#!/bin/bash

# Set your domain
DOMAIN="api.yourdomain.com"

# Request certificate
CERT_ARN=$(aws acm request-certificate \
  --domain-name $DOMAIN \
  --validation-method DNS \
  --query 'CertificateArn' \
  --output text \
  --region us-east-1)

echo "Certificate ARN: $CERT_ARN"
echo ""
echo "Next steps:"
echo "1. Validate certificate in ACM console"
echo "2. Add to terraform.tfvars:"
echo "   enable_backend_https = true"
echo "   backend_certificate_arn = \"$CERT_ARN\""
echo "3. Run: terraform apply"
echo "4. Create DNS record: $DOMAIN → ALB DNS"
echo "5. Update VITE_API_BASE=https://$DOMAIN/api"
```

## Cost

- **ACM Certificates**: FREE
- **HTTPS traffic on ALB**: No additional cost
- **Domain name**: ~$12/year (varies)

## Security Benefits

✅ Encrypted traffic between browser and backend
✅ No mixed content warnings
✅ Browser trust (with valid certificate)
✅ Required for production apps

## Testing HTTPS

After setup, test:

```bash
# Test HTTPS endpoint
curl -v https://api.yourdomain.com/api/heartbeat

# Should return:
# {"ok":true,"service":"movie-api-backend"}

# Check certificate
openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com
```

## Rollback

If you need to disable HTTPS:

```hcl
# terraform.tfvars
enable_backend_https = false
```

```bash
terraform apply
```

## FAQ

**Q: Can I use the ALB DNS directly without a domain?**
A: No, ACM certificates require a domain name. You need to own a domain.

**Q: Do I need to pay for a domain?**
A: Yes, but domains are cheap (~$12/year). Route53 domains start at $12.

**Q: Can I use Let's Encrypt instead of ACM?**
A: You can, but ACM is easier and free. Let's Encrypt requires manual renewal.

**Q: How do I get a free domain?**
A: Free domains (like .tk, .ml) exist but are not recommended for production. Use a cheap .com domain.

## Next Steps

1. Get a domain name (Route53, Namecheap, etc.)
2. Request ACM certificate
3. Validate certificate
4. Update terraform.tfvars with certificate ARN
5. Apply terraform
6. Create DNS record
7. Update frontend to use HTTPS URL
8. Redeploy

Need help? Check the [AWS ACM Documentation](https://docs.aws.amazon.com/acm/)
