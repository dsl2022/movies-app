#!/bin/bash
# Script to build and deploy backend to ECS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/../infra"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backend Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if terraform state exists
if [ ! -d "$INFRA_DIR/.terraform" ]; then
    echo -e "${RED}Error: Terraform not initialized. Run 'terraform init' first.${NC}"
    exit 1
fi

# Get ECR repository URL and region
cd "$INFRA_DIR"
ECR_URL=$(terraform output -raw ecr_repository_url 2>/dev/null)
AWS_REGION=$(terraform output -raw aws_region 2>/dev/null || echo "us-east-1")
ECS_CLUSTER=$(terraform output -raw ecs_cluster_name 2>/dev/null)
ECS_SERVICE=$(terraform output -raw ecs_service_name 2>/dev/null)

if [ -z "$ECR_URL" ]; then
    echo -e "${RED}Error: Could not get ECR repository URL from Terraform outputs${NC}"
    echo "Make sure you've run 'terraform apply' first"
    exit 1
fi

echo -e "${YELLOW}ECR Repository:${NC} $ECR_URL"
echo -e "${YELLOW}AWS Region:${NC} $AWS_REGION"
echo -e "${YELLOW}ECS Cluster:${NC} $ECS_CLUSTER"
echo -e "${YELLOW}ECS Service:${NC} $ECS_SERVICE"
echo ""

# Parse image tag (default to git commit hash or 'latest')
if [ -n "$1" ]; then
    IMAGE_TAG="$1"
elif git rev-parse --git-dir > /dev/null 2>&1; then
    IMAGE_TAG=$(git rev-parse --short HEAD)
else
    IMAGE_TAG="latest"
fi

FULL_IMAGE_NAME="$ECR_URL:$IMAGE_TAG"

echo -e "${YELLOW}Image Tag:${NC} $IMAGE_TAG"
echo -e "${YELLOW}Full Image:${NC} $FULL_IMAGE_NAME"
echo ""

# Step 1: Login to ECR
echo -e "${GREEN}[1/5] Logging in to ECR...${NC}"
aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "$ECR_URL"

# Step 2: Build Docker image
echo -e "${GREEN}[2/5] Building Docker image...${NC}"
cd "$SCRIPT_DIR"
docker build -t "$FULL_IMAGE_NAME" .

# Also tag as latest
docker tag "$FULL_IMAGE_NAME" "$ECR_URL:latest"

# Step 3: Push to ECR
echo -e "${GREEN}[3/5] Pushing image to ECR...${NC}"
docker push "$FULL_IMAGE_NAME"
docker push "$ECR_URL:latest"

# Step 4: Update ECS service
echo -e "${GREEN}[4/5] Updating ECS service...${NC}"
aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$ECS_SERVICE" \
    --force-new-deployment \
    --region "$AWS_REGION" \
    > /dev/null

# Step 5: Wait for deployment
echo -e "${GREEN}[5/5] Waiting for deployment to complete...${NC}"
echo "This may take a few minutes..."

aws ecs wait services-stable \
    --cluster "$ECS_CLUSTER" \
    --services "$ECS_SERVICE" \
    --region "$AWS_REGION"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get ALB URL
cd "$INFRA_DIR"
ALB_URL=$(terraform output -raw alb_url 2>/dev/null)
if [ -n "$ALB_URL" ]; then
    echo -e "${YELLOW}Backend URL:${NC} $ALB_URL"
    echo -e "${YELLOW}Health Check:${NC} $ALB_URL/api/heartbeat"
fi

echo ""
echo "Test the deployment:"
echo "  curl $ALB_URL/api/heartbeat"
