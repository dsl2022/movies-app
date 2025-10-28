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
echo ""
echo "✅ API URL (for frontend)"
echo "--------------------"
echo "BACKEND_API_URL=$(terraform output -raw alb_url 2>/dev/null || echo 'N/A')/api"
echo ""
echo "Note: ALB_NAME_PROD is no longer needed - the workflow auto-discovers it!"

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
echo "BACKEND_API_URL (for frontend builds)"
ALB_URL=$(terraform output -raw alb_url 2>/dev/null || echo 'N/A')
echo "${ALB_URL}/api"
echo ""
echo "=========================================="
echo "✅ Add each of these to GitHub!"
echo "=========================================="
