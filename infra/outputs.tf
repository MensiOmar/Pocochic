output "d1_database_id" {
  description = "Value for database_id in both wrangler.toml files."
  value       = cloudflare_d1_database.pocochic.uuid
}

output "d1_database_name" {
  description = "D1 database name."
  value       = cloudflare_d1_database.pocochic.name
}

output "r2_bucket_name" {
  description = "Private catalog bucket."
  value       = cloudflare_r2_bucket.catalog.name
}

output "pages_project_name" {
  description = "Pages project that receives the shop build."
  value       = cloudflare_pages_project.shop.name
}

output "pages_subdomain" {
  description = "Hostname suffix Cloudflare assigned to the Pages project."
  value       = cloudflare_pages_project.shop.subdomain
}
