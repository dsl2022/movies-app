#!/bin/bash
# Script to get all GitHub variables needed for CI/CD

cd infra

echo "=========================================="
echo "GitHub Variables for CI/CD"
echo "=========================================="
echo ""
echo "Go to: Repository → Settings → Secrets and variables → Actions → Variables"
echo ""

# Check if terraform state exists
if [ ! -f "terraform.tfstate" ] && [ ! -f ".terraform/terraform.tfstate" ]; then
    echo "❌ Error: Terraform state not found. Run 'terraform apply' first."
    exit 1
fi

echo "✅ FRONTEND Variables"
echo "--------------------"
echo "S3_BUCKET_NAME_PROD=$(terraform output -raw frontend_bucket_name 2>/dev/null || echo 'N/A')"
echo "CLOUDFRONT_DISTRIBUTION_ID_PROD=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo 'N/A')"
echo ""

echo "✅ BACKEND Variables"
echo "--------------------"
echo "ECR_REPOSITORY_NAME_PROD=$(terraform output -raw ecr_repository_name 2>/dev/null || echo 'N/A')"
echo "ECS_CLUSTER_NAME_PROD=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo 'N/A')"
echo "ECS_SERVICE_NAME_PROD=$(terraform output -raw ecs_service_name 2>/dev/null || echo 'N/A')"

ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null)
if [ -n "$ALB_DNS" ]; then
    ALB_NAME=$(echo $ALB_DNS | sed 's/-[0-9]*.*.elb.amazonaws.com//')
    echo "ALB_NAME_PROD=$ALB_NAME"
else
    echo "ALB_NAME_PROD=N/A"
fi

echo ""
echo "=========================================="
echo "Copy-Paste Ready Format"
echo "=========================================="
echo ""
echo "Frontend:"
echo "S3_BUCKET_NAME_PROD"
echo "$(terraform output -raw frontend_bucket_name 2>/dev/null || echo 'N/A')"
echo ""
echo "CLOUDFRONT_DISTRIBUTION_ID_PROD"
echo "$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo 'N/A')"
echo ""
echo "Backend:"
echo "ECR_REPOSITORY_NAME_PROD"
echo "$(terraform output -raw ecr_repository_name 2>/dev/null || echo 'N/A')"
echo ""
echo "ECS_CLUSTER_NAME_PROD"
echo "$(terraform output -raw ecs_cluster_name 2>/dev/null || echo 'N/A')"
echo ""
echo "ECS_SERVICE_NAME_PROD"
echo "$(terraform output -raw ecs_service_name 2>/dev/null || echo 'N/A')"
echo ""
echo "ALB_NAME_PROD"
if [ -n "$ALB_DNS" ]; then
    echo $ALB_DNS | sed 's/-[0-9]*.*.elb.amazonaws.com//'
else
    echo "N/A"
fi
echo ""
echo "=========================================="
echo "✅ Add each of these to GitHub!"
echo "=========================================="
