variable "environment" {
  type        = string
  description = "Deployment environment name."
}

variable "service_name" {
  type        = string
  description = "Logical name of the ECS service."
}

variable "container_image" {
  type        = string
  description = "Container image URI."
}

variable "desired_count" {
  type        = number
  default     = 1
  description = "Desired number of ECS tasks."
}

variable "subnet_ids" {
  type        = list(string)
  default     = []
  description = "Subnets where ECS tasks run."
}

variable "security_group_ids" {
  type        = list(string)
  default     = []
}

variable "tags" {
  type        = map(string)
  default     = {}
}

# TODO: Define ECS cluster, task definition, service, autoscaling policies, and IAM roles.

output "service_arn" {
  value       = null
  description = "ARN of created ECS service (placeholder)."
}
