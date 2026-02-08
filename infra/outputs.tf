output "service_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.frontend_ui.uri
}

output "artifact_registry_url" {
  description = "Docker image repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.frontend.repository_id}"
}

output "cloud_run_service_account" {
  description = "Service Account used by Cloud Run service"
  value       = google_service_account.cloud_run.email
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

output "github_configuration_summary" {
  description = "Summary of values needed for GitHub Actions configuration"
  value       = <<-EOT

    ============================================
    GitHub Repository Configuration
    ============================================

    Add these as GitHub repository variables (Settings > Secrets and variables > Actions > Variables):

    GCP_PROJECT_ID: ${var.project_id}
    GCP_REGION: ${var.region}
    GCP_SERVICE_NAME: ${var.service_name}
    API_URL: ${var.api_url}
    SIGNALING_URL: ${var.signaling_url}

    ============================================
    Service URL: ${google_cloud_run_v2_service.frontend_ui.uri}
    ============================================
  EOT
}
