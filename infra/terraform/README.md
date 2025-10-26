# Terraform Skeleton

This directory houses the infrastructure-as-code scaffold described in `docs/production-infrastructure.md`. Each module is a placeholder—fill in resource definitions as you execute the rollout plan.

## Structure

```
infra/terraform
├── environments
│   ├── staging
│   │   ├── main.tf
│   │   └── variables.tf
│   └── production
│       ├── main.tf
│       └── variables.tf
├── modules
│   ├── network
│   ├── db
│   ├── redis
│   ├── ecs-service
│   └── s3-bucket
├── providers.tf
├── variables.tf
└── versions.tf
```

## Next Steps

1. Configure backend blocks (S3/Dynamo) in `environments/*/main.tf`.
2. Implement module internals (VPC, ECS, RDS, etc.) following the production playbook.
3. Run `terraform init` within each environment directory, then `terraform plan`.
4. Store AWS credentials in your chosen vault/secrets manager and inject via automation (GitHub Actions or Atlantis).
