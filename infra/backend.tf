# Backend configuration for Terraform state
#
# Uncomment and configure after creating a GCS bucket for state storage
# This is optional for MVP but recommended for production
#
# To create the bucket:
# gcloud storage buckets create gs://YOUR-PROJECT-ID-tfstate --location=us-central1
#
# Then uncomment below:

# terraform {
#   backend "gcs" {
#     bucket = "YOUR-PROJECT-ID-tfstate"
#     prefix = "medical-triage-ui/state"
#   }
# }
