terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

locals {
  api_services = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudresourcemanager.googleapis.com"
  ]

  image_name = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.frontend.repository_id}/${var.service_name}"
}

resource "google_project_service" "required_apis" {
  for_each = toset(local.api_services)

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

# Artifact Registry repository for Docker images
resource "google_artifact_registry_repository" "frontend" {
  location      = var.region
  repository_id = "${var.service_name}-images"
  description   = "Docker repository for ${var.service_name}"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  cleanup_policies {
    id     = "delete-old-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s" # 7 days
    }
  }

  depends_on = [google_project_service.required_apis]

  lifecycle {
    prevent_destroy = false
    ignore_changes = [
      cleanup_policies,
    ]
  }
}

# Cloud Run service for the Angular frontend
resource "google_cloud_run_v2_service" "frontend_ui" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    service_account = google_service_account.cloud_run.email

    containers {
      # Initial placeholder image - will be replaced by CI/CD
      image = "${local.image_name}:latest"

      ports {
        container_port = 4200
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        http_get {
          path = "/"
          port = 4200
        }
        initial_delay_seconds = 0
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/"
          port = 4200
        }
        initial_delay_seconds = 10
        timeout_seconds       = 3
        period_seconds        = 30
        failure_threshold     = 3
      }
    }

    timeout                          = "${var.timeout_seconds}s"
    max_instance_request_concurrency = var.container_concurrency
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [google_project_service.required_apis]

  lifecycle {
    create_before_destroy = true
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
      labels,
      annotations,
    ]
  }
}

# Allow unauthenticated access (public website)
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.frontend_ui.location
  name     = google_cloud_run_v2_service.frontend_ui.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Service account for Cloud Run
resource "google_service_account" "cloud_run" {
  account_id   = "${var.service_name}-sa"
  display_name = "Service Account for ${var.service_name} Cloud Run"

  lifecycle {
    prevent_destroy = false
  }
}
