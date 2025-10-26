terraform {
  backend "s3" {
    # Configure in infra/secrets before `terraform init`.
  }
}

locals {
  environment = "staging"
}

module "network" {
  source      = "../../modules/network"
  environment = local.environment
  cidr_block  = var.vpc_cidr
  tags        = var.tags
}

module "db" {
  source             = "../../modules/db"
  environment        = local.environment
  db_name            = "autorepost"
  subnet_ids         = module.network.private_subnet_ids
  security_group_ids = []
  tags               = var.tags
}

module "redis" {
  source             = "../../modules/redis"
  environment        = local.environment
  subnet_ids         = module.network.private_subnet_ids
  security_group_ids = []
  tags               = var.tags
}

module "api_service" {
  source             = "../../modules/ecs-service"
  environment        = local.environment
  service_name       = "api"
  container_image    = var.api_image
  desired_count      = 1
  subnet_ids         = module.network.private_subnet_ids
  security_group_ids = []
  tags               = var.tags
}

module "worker_service" {
  source             = "../../modules/ecs-service"
  environment        = local.environment
  service_name       = "worker"
  container_image    = var.worker_image
  desired_count      = 1
  subnet_ids         = module.network.private_subnet_ids
  security_group_ids = []
  tags               = var.tags
}

module "media_bucket" {
  source      = "../../modules/s3-bucket"
  environment = local.environment
  bucket_name = var.media_bucket_name
  tags        = var.tags
}
