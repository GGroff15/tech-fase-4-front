variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run deployment"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
  default     = "medical-triage-ui"
}

variable "api_url" {
  description = "URL of the backend API service (used as Docker build arg)"
  type        = string
}

variable "signaling_url" {
  description = "URL of the WebRTC signaling service (used as Docker build arg)"
  type        = string
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances (0 = scale to zero)"
  type        = number
  default     = 0
}

variable "memory_limit" {
  description = "Memory limit for Cloud Run service"
  type        = string
  default     = "256Mi"
}

variable "cpu_limit" {
  description = "CPU limit for Cloud Run service"
  type        = string
  default     = "1"
}

variable "container_concurrency" {
  description = "Maximum number of concurrent requests per container"
  type        = number
  default     = 80
}

variable "timeout_seconds" {
  description = "Request timeout in seconds"
  type        = number
  default     = 60
}
