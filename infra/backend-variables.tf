# Backend-specific variables

variable "backend_port" {
  description = "Port the backend application runs on"
  type        = number
  default     = 4000
}

variable "backend_cpu" {
  description = "Fargate CPU units (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Fargate memory in MB (512, 1024, 2048, etc.)"
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 1
}

variable "backend_min_capacity" {
  description = "Minimum number of backend tasks for autoscaling"
  type        = number
  default     = 1
}

variable "backend_max_capacity" {
  description = "Maximum number of backend tasks for autoscaling"
  type        = number
  default     = 4
}

variable "backend_health_check_path" {
  description = "Health check endpoint path"
  type        = string
  default     = "/api/heartbeat"
}

variable "enable_backend_autoscaling" {
  description = "Enable autoscaling for backend ECS service"
  type        = bool
  default     = true
}

variable "backend_image_tag" {
  description = "Docker image tag for backend (e.g., latest, v1.0.0)"
  type        = string
  default     = "latest"
}

variable "enable_backend_https" {
  description = "Enable HTTPS listener on ALB (requires ACM certificate)"
  type        = bool
  default     = false
}

variable "backend_certificate_arn" {
  description = "ARN of ACM certificate for backend HTTPS (required if enable_backend_https is true)"
  type        = string
  default     = ""
}

variable "redirect_http_to_https" {
  description = "Redirect HTTP traffic to HTTPS (only applies if enable_backend_https is true)"
  type        = bool
  default     = true
}
