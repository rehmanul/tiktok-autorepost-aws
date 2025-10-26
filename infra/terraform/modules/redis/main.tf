variable "environment" {
  type        = string
  description = "Deployment environment."
}

variable "node_type" {
  type    = string
  default = "cache.t3.micro"
}

variable "subnet_ids" {
  type    = list(string)
  default = []
}

variable "security_group_ids" {
  type    = list(string)
  default = []
}

variable "tags" {
  type        = map(string)
  default     = {}
}

# TODO: Provision ElastiCache Redis replication group with TLS and AUTH.

output "redis_endpoint" {
  value       = null
  description = "Redis endpoint (placeholder)."
}
