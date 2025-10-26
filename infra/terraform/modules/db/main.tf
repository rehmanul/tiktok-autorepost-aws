variable "environment" {
  type        = string
  description = "Deployment environment."
}

variable "db_name" {
  type        = string
  description = "Database name."
}

variable "instance_class" {
  type        = string
  default     = "db.t4g.medium"
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

# TODO: Implement RDS instance/cluster (PostgreSQL) with multi-AZ, backups, and encryption.

output "db_endpoint" {
  value       = null
  description = "RDS endpoint (placeholder)."
}

output "db_secret_arn" {
  value       = null
  description = "Secret storing credentials (placeholder)."
}
