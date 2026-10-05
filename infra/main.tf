# One D1 database, named pocochic, shared by shop-api and admin-api.
moved {
  from = cloudflare_d1_database.shop
  to   = cloudflare_d1_database.pocochic
}

resource "cloudflare_d1_database" "pocochic" {
  account_id            = var.account_id
  name                  = var.d1_database_name
  primary_location_hint = var.d1_primary_location_hint
  read_replication = {
    mode = var.d1_read_replication_mode
  }
}

resource "cloudflare_r2_bucket" "catalog" {
  account_id = var.account_id
  name       = var.r2_bucket_name
  location   = var.r2_location
}

resource "cloudflare_pages_project" "shop" {
  account_id        = var.account_id
  name              = var.pages_project_name
  production_branch = var.pages_production_branch

  # Direct upload. GitHub Actions runs the build. A Git source would double-deploy.
  lifecycle {
    ignore_changes = [
      build_config,
      deployment_configs,
    ]
  }
}
