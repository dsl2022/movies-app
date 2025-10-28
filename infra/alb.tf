# Application Load Balancer Security Group
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg-${var.environment}"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-alb-sg-${var.environment}"
    Environment = var.environment
  })
}

# Application Load Balancer
resource "aws_lb" "backend" {
  name               = "${substr(var.project_name, 0, 15)}-be-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false
  enable_http2               = true
  enable_cross_zone_load_balancing = true

  tags = merge(var.tags, {
    Name        = "${var.project_name}-backend-alb-${var.environment}"
    Environment = var.environment
  })
}

# Target Group for ECS tasks
resource "aws_lb_target_group" "backend" {
  name        = "${substr(var.project_name, 0, 15)}-be-tg-${var.environment}"
  port        = var.backend_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = var.backend_health_check_path
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = merge(var.tags, {
    Name        = "${var.project_name}-backend-tg-${var.environment}"
    Environment = var.environment
  })
}

# HTTP Listener (redirect to HTTPS if cert available, otherwise serve traffic)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.backend.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-http-listener-${var.environment}"
    Environment = var.environment
  })
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  count             = var.enable_backend_https ? 1 : 0
  load_balancer_arn = aws_lb.backend.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.backend_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-https-listener-${var.environment}"
    Environment = var.environment
  })
}

# Redirect HTTP to HTTPS (optional)
resource "aws_lb_listener_rule" "redirect_http_to_https" {
  count        = var.enable_backend_https && var.redirect_http_to_https ? 1 : 0
  listener_arn = aws_lb_listener.http.arn

  action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
