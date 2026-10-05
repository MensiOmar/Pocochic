variable "account_id" {
  description = "Cloudflare account id."
  type        = string
}

variable "d1_database_name" {
  description = "Name of the shared shop D1 database."
  type        = string
}

variable "d1_primary_location_hint" {
  description = "D1 primary location hint. weur is the closest region to Tunisia."
  type        = string
}

variable "d1_read_replication_mode" {
  description = "D1 read replication mode. disabled keeps every query on the primary."
  type        = string
}

variable "r2_bucket_name" {
  description = "Private catalog bucket name."
  type        = string
}

variable "r2_location" {
  description = "R2 bucket location hint."
  type        = string
}

variable "pages_project_name" {
  description = "Cloudflare Pages project for the direct-upload shop."
  type        = string
}

variable "pages_production_branch" {
  description = "Branch name Pages treats as production. Deploys still come from GitHub Actions, not a Git connection."
  type        = string
}
