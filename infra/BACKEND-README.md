# Backend ECS Infrastructure

Complete Terraform infrastructure for deploying the Express.js backend to AWS ECS with Fargate.

## Architecture Overview

```
Internet → ALB (Public Subnets) → ECS Fargate (Private Subnets) → NAT Gateway → Internet
                                        ↓
                                  CloudWatch Logs
```

## Resources Created

### Networking
- **VPC** - Isolated network (10.0.0.0/16)
- **Public Subnets (2)** - For Application Load Balancer
- **Private Subnets (2)** - For ECS tasks (better security)
- **NAT Gateways (2)** - Allow private subnets to access internet
- **Internet Gateway** - Public internet access
- **Route Tables** - Properly configured routing

### Container Infrastructure
- **ECR Repository** - Stores Docker images
- **ECS Cluster** - Container orchestration
- **ECS Service** - Manages running tasks
- **ECS Task Definition** - Container configuration
- **Application Load Balancer** - Distributes traffic
- **Target Group** - Health checks and routing
- **CloudWatch Log Group** - Application logs

### Security
- **Security Groups** - Firewall rules for ALB and ECS tasks
- **IAM Roles** - Task execution and application permissions
- **Private Subnets** - Tasks not directly exposed to internet

### Auto Scaling
- **CPU-based scaling** - Scales when CPU > 70%
- **Memory-based scaling** - Scales when memory > 80%
- **Min/Max capacity** - Configurable task count

## Prerequisites

1. **Docker** installed locally
2. **AWS CLI** configured with credentials
3. **Terraform** already initialized

## Quick Start

### 1. Apply Terraform Configuration

```bash
cd infra
terraform plan
terraform apply
```

This will create:
- VPC and networking (2 NAT Gateways: ~$64/month)
- ALB (~$16/month)
- ECR repository (free)
- ECS cluster (free)
- Service will start but fail until you push an image

### 2. Build and Deploy Backend

```bash
cd ../server

# Deploy with automatic image tag (git commit hash)
./deploy.sh

# Or deploy with specific tag
./deploy.sh v1.0.0
```

The script will:
1. Login to ECR
2. Build Docker image
3. Push to ECR
4. Update ECS service
5. Wait for deployment to complete

### 3. Test the Deployment

```bash
# Get the ALB URL
cd ../infra
terraform output alb_url

# Test health check
curl $(terraform output -raw alb_url)/api/heartbeat
```

Expected response:
```json
{
  "ok": true,
  "service": "movie-api-backend"
}
```

## Manual Docker Build & Push

If you prefer manual deployment:

```bash
# Get ECR repository URL
cd infra
ECR_URL=$(terraform output -raw ecr_repository_url)
AWS_REGION=$(terraform output -raw aws_region)

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_URL

# Build image
cd ../server
docker build -t $ECR_URL:latest .

# Push image
docker push $ECR_URL:latest

# Force new deployment
ECS_CLUSTER=$(cd ../infra && terraform output -raw ecs_cluster_name)
ECS_SERVICE=$(cd ../infra && terraform output -raw ecs_service_name)

aws ecs update-service \
  --cluster $ECS_CLUSTER \
  --service $ECS_SERVICE \
  --force-new-deployment \
  --region $AWS_REGION
```

## Configuration

Edit [terraform.tfvars](terraform.tfvars) to customize:

```hcl
# Backend Configuration
backend_port           = 4000          # Container port
backend_cpu            = 256           # CPU units (256 = 0.25 vCPU)
backend_memory         = 512           # Memory in MB
backend_desired_count  = 1             # Initial task count
backend_min_capacity   = 1             # Min tasks for autoscaling
backend_max_capacity   = 4             # Max tasks for autoscaling
enable_backend_autoscaling = true      # Enable/disable autoscaling
backend_image_tag      = "latest"      # Docker image tag
```

### CPU & Memory Options (Fargate)

Valid combinations:
- 256 CPU (0.25 vCPU): 512MB, 1GB, 2GB
- 512 CPU (0.5 vCPU): 1GB, 2GB, 3GB, 4GB
- 1024 CPU (1 vCPU): 2GB, 3GB, 4GB, 5GB, 6GB, 7GB, 8GB
- 2048 CPU (2 vCPU): 4GB - 16GB (1GB increments)
- 4096 CPU (4 vCPU): 8GB - 30GB (1GB increments)

## Environment Variables

Add environment variables to ECS task definition in [ecs.tf](ecs.tf):

```hcl
environment = [
  {
    name  = "PORT"
    value = tostring(var.backend_port)
  },
  {
    name  = "NODE_ENV"
    value = var.environment
  },
  {
    name  = "DATABASE_URL"
    value = "your-database-url"
  }
]
```

For **secrets** (passwords, API keys), use AWS Secrets Manager:

```hcl
secrets = [
  {
    name      = "DATABASE_PASSWORD"
    valueFrom = aws_secretsmanager_secret.db_password.arn
  }
]
```

## Monitoring & Debugging

### View Logs

```bash
# Get log group name
cd infra
LOG_GROUP=$(terraform output -raw ecs_cluster_name | sed 's/cluster/logs/')

# Tail logs
aws logs tail "/ecs/movies-app-backend-dev" --follow --region us-east-1
```

Or view in AWS Console: CloudWatch → Log Groups → `/ecs/movies-app-backend-dev`

### Check Service Status

```bash
ECS_CLUSTER=$(cd infra && terraform output -raw ecs_cluster_name)
ECS_SERVICE=$(cd infra && terraform output -raw ecs_service_name)

aws ecs describe-services \
  --cluster $ECS_CLUSTER \
  --services $ECS_SERVICE \
  --region us-east-1
```

### Check Running Tasks

```bash
aws ecs list-tasks \
  --cluster $ECS_CLUSTER \
  --service-name $ECS_SERVICE \
  --region us-east-1
```

### View Task Details

```bash
TASK_ARN=$(aws ecs list-tasks --cluster $ECS_CLUSTER --service-name $ECS_SERVICE --query 'taskArns[0]' --output text)

aws ecs describe-tasks \
  --cluster $ECS_CLUSTER \
  --tasks $TASK_ARN \
  --region us-east-1
```

## Troubleshooting

### Service Fails to Start

1. **Check logs** in CloudWatch
2. **Verify image exists** in ECR:
   ```bash
   aws ecr list-images --repository-name $(cd infra && terraform output -raw ecr_repository_name)
   ```
3. **Check security groups** - ECS tasks should allow traffic from ALB
4. **Verify health check** - `/api/heartbeat` should return 200

### Tasks Keep Stopping

1. Check CloudWatch logs for errors
2. Verify health check endpoint is responding
3. Increase health check grace period in [ecs.tf](ecs.tf):
   ```hcl
   health_check_grace_period_seconds = 120
   ```

### Cannot Access ALB

1. Verify ALB security group allows inbound traffic on port 80
2. Check that public subnets have internet gateway route
3. Wait 2-3 minutes after deployment for DNS propagation

### Out of Memory Errors

Increase memory in [terraform.tfvars](terraform.tfvars):
```hcl
backend_memory = 1024  # Increase from 512 to 1024
```

## Cost Estimation

**Monthly costs** (us-east-1, approximate):

### Compute (ECS Fargate)
- 1 task (0.25 vCPU, 0.5GB RAM): ~$10/month
- 2 tasks: ~$20/month
- 4 tasks: ~$40/month

### Networking
- 2 NAT Gateways: ~$64/month
- Data transfer: ~$0.09/GB

### Load Balancer
- Application Load Balancer: ~$16/month
- Data processing: ~$0.008/GB

### Storage & Logs
- ECR storage: ~$0.10/GB/month
- CloudWatch Logs: ~$0.50/GB ingested

**Total for dev environment (1 task):** ~$95-110/month

### Cost Optimization Tips

1. **Use single NAT Gateway** for dev:
   - Edit [vpc.tf](vpc.tf) to create only 1 NAT Gateway
   - Saves ~$32/month

2. **Use Fargate Spot** for non-prod:
   - Edit capacity provider strategy in [ecs.tf](ecs.tf)
   - Saves ~70% on compute

3. **Reduce log retention**:
   - Change `retention_in_days = 7` to `1` in [ecs.tf](ecs.tf)

4. **Turn off when not in use**:
   ```bash
   aws ecs update-service --cluster $CLUSTER --service $SERVICE --desired-count 0
   ```

## Auto Scaling

Auto scaling is configured based on:

- **CPU > 70%** → Scale out (add tasks)
- **Memory > 80%** → Scale out (add tasks)
- **Min capacity**: 1 task
- **Max capacity**: 4 tasks

Cooldown periods:
- Scale out: 60 seconds
- Scale in: 300 seconds (5 minutes)

To test autoscaling:
```bash
# Generate load
ab -n 10000 -c 100 $(terraform output -raw alb_url)/api/heartbeat
```

## Custom Domain Setup

To use a custom domain (e.g., `api.example.com`):

1. **Create ACM certificate** in us-east-1
2. **Add HTTPS listener** in [alb.tf](alb.tf) (uncomment lines)
3. **Create Route53 record**:
   ```bash
   ALB_DNS=$(cd infra && terraform output -raw alb_dns_name)
   ALB_ZONE=$(cd infra && terraform output -raw alb_zone_id)

   # Create A record (alias) pointing to ALB
   ```

## Multi-Environment Setup

Deploy to multiple environments:

### Option 1: Terraform Workspaces
```bash
terraform workspace new staging
terraform workspace new prod
terraform apply
```

### Option 2: Separate Directories
```
infra/
├── dev/
├── staging/
└── prod/
```

## Security Best Practices

- ✅ Tasks run in private subnets
- ✅ No direct internet access to containers
- ✅ Security groups restrict traffic
- ✅ CloudWatch logs enabled
- ✅ ECR image scanning enabled
- ✅ IAM roles follow least privilege
- ✅ Container runs as non-root user

## Next Steps

- [ ] Add RDS database
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Configure custom domain with Route53
- [ ] Add HTTPS with ACM certificate
- [ ] Set up CloudWatch alarms
- [ ] Implement blue-green deployments
- [ ] Add WAF for API protection
- [ ] Configure VPC endpoints for AWS services

## Useful Commands

```bash
# Get all outputs
terraform output

# Get specific output
terraform output alb_url
terraform output ecr_repository_url

# Format Terraform files
terraform fmt

# Validate configuration
terraform validate

# Destroy all resources (careful!)
terraform destroy
```

## Documentation

- [ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [ALB Documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
