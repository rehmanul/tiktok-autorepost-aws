variable "environment" {
  type        = string
  description = "Deployment environment."
}

variable "bucket_name" {
  type        = string
  description = "S3 bucket name."
}

variable "tags" {
  type        = map(string)
  default     = {}
}

# TODO: Configure S3 bucket with versioning, encryption, lifecycle, and least-privilege policy.

output "bucket_id" {
  value       = null
  description = "ID of created bucket (placeholder)."
}
