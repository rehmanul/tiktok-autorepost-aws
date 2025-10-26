variable "vpc_cidr" {
  type        = string
  default     = "10.20.0.0/16"
  description = "CIDR block for production VPC."
}

variable "api_image" {
  type        = string
  default     = "000000000000.dkr.ecr.us-east-1.amazonaws.com/autorepost-api:prod"
  description = "ECR image for API service."
}

variable "worker_image" {
  type        = string
  default     = "000000000000.dkr.ecr.us-east-1.amazonaws.com/autorepost-worker:prod"
  description = "ECR image for worker service."
}

variable "media_bucket_name" {
  type        = string
  default     = "autorepost-prod-media"
  description = "S3 bucket for media storage."
}

variable "tags" {
  type = map(string)
  default = {
    Environment = "production"
    Project     = "autorepost"
  }
}
