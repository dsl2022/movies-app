#!/bin/bash
# Script to help set up GitHub Actions secrets and variables
# This script displays the values you need to add to GitHub

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$REPO_ROOT/infra"

echo "=========================================="
echo "GitHub Actions Setup Helper"
echo "=========================================="
echo ""

# Check if we're in a git repo
if ! git -C "$REPO_ROOT" rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Get repository info
REPO_URL=$(git -C "$REPO_ROOT" config --get remote.origin.url)
echo "Repository: $REPO_URL"
echo ""

# Check if Terraform state exists
if [ ! -f "$INFRA_DIR/terraform.tfstate" ] && [ ! -f "$INFRA_DIR/.terraform/terraform.tfstate" ]; then
    echo "⚠️  Warning: Terraform state not found. Run 'terraform apply' first."
    echo ""
fi

echo "=========================================="
echo "Step 1: Add GitHub Secrets"
echo "=========================================="
echo ""
echo "Go to: Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo "Add these SECRETS (encrypted):"
echo "  Name: AWS_ACCESS_KEY_ID"
echo "  Value: <your-aws-access-key-id>"
echo ""
echo "  Name: AWS_SECRET_ACCESS_KEY"
echo "  Value: <your-aws-secret-access-key>"
echo ""

echo "=========================================="
echo "Step 2: Add GitHub Variables"
echo "=========================================="
echo ""
echo "Go to: Settings → Secrets and variables → Actions → Variables tab → New repository variable"
echo ""

# Try to get values from Terraform
if [ -d "$INFRA_DIR/.terraform" ]; then
    echo "Getting values from Terraform..."
    echo ""

    cd "$INFRA_DIR"

    if command -v terraform &> /dev/null; then
        BUCKET_NAME=$(terraform output -raw frontend_bucket_name 2>/dev/null || echo "<run terraform output frontend_bucket_name>")
        CF_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "<run terraform output cloudfront_distribution_id>")

        echo "Add these VARIABLES (plain text):"
        echo "  Name: S3_BUCKET_NAME_PROD"
        echo "  Value: $BUCKET_NAME"
        echo ""
        echo "  Name: CLOUDFRONT_DISTRIBUTION_ID_PROD"
        echo "  Value: $CF_ID"
        echo ""
    else
        echo "Terraform not found. Install it or manually run:"
        echo "  cd infra"
        echo "  terraform output frontend_bucket_name"
        echo "  terraform output cloudfront_distribution_id"
        echo ""
    fi
else
    echo "Add these VARIABLES (plain text):"
    echo "  Name: S3_BUCKET_NAME_PROD"
    echo "  Value: <run: terraform output frontend_bucket_name>"
    echo ""
    echo "  Name: CLOUDFRONT_DISTRIBUTION_ID_PROD"
    echo "  Value: <run: terraform output cloudfront_distribution_id>"
    echo ""
fi

echo "For development environment (optional):"
echo "  Name: S3_BUCKET_NAME_DEV"
echo "  Value: <your-dev-bucket-name>"
echo ""
echo "  Name: CLOUDFRONT_DISTRIBUTION_ID_DEV"
echo "  Value: <your-dev-cloudfront-id>"
echo ""

echo "=========================================="
echo "Step 3: Create IAM Policy (if not done)"
echo "=========================================="
echo ""
echo "Create an IAM user with this policy:"
echo ""
cat << 'EOF'
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
EOF
echo ""

echo "=========================================="
echo "Step 4: Test the Workflow"
echo "=========================================="
echo ""
echo "Option 1: Push changes to trigger automatically"
echo "  git add ."
echo "  git commit -m 'feat: update frontend'"
echo "  git push origin main"
echo ""
echo "Option 2: Trigger manually from GitHub"
echo "  1. Go to Actions tab"
echo "  2. Select 'Deploy Frontend to AWS'"
echo "  3. Click 'Run workflow'"
echo ""

echo "=========================================="
echo "Done! 🎉"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Add secrets and variables to GitHub"
echo "  2. Push changes to trigger deployment"
echo "  3. Check Actions tab for deployment status"
echo ""
