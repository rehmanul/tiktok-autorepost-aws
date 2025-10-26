variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "cidr_block" {
  description = "VPC CIDR block."
  type        = string
}

variable "tags" {
  description = "Base tags."
  type        = map(string)
  default     = {}
}

# TODO: Implement VPC, subnets, and security groups.
# Placeholder outputs allow downstream modules to reference IDs once implemented.

output "vpc_id" {
  value       = null
  description = "ID of the created VPC (placeholder)."
}

output "private_subnet_ids" {
  value       = []
  description = "IDs of private subnets (placeholder)."
}

output "public_subnet_ids" {
  value       = []
  description = "IDs of public subnets (placeholder)."
}
