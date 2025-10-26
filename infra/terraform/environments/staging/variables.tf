variable "vpc_cidr" {
  type        = string
  default     = "10.10.0.0/16"
  description = "CIDR block for staging VPC."
}

variable "api_image" {
  type        = string
  default     = "000000000000.dkr.ecr.us-east-1.amazonaws.com/autorepost-api:staging"
  description = "ECR image for API service."
}

variable "worker_image" {
  type        = string
  default     = "000000000000.dkr.ecr.us-east-1.amazonaws.com/autorepost-worker:staging"
  description = "ECR image for worker service."
}

variable "media_bucket_name" {
  type        = string
  default     = "autorepost-staging-media"
  description = "S3 bucket for temporary media storage."
}

variable "tags" {
  type = map(string)
  default = {
    Environment = "staging"
    Project     = "autorepost"
  }
}
