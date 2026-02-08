# Infrastructure Setup Guide

This guide walks you through deploying the Assisted Medical Triage UI to Google Cloud Platform using Terraform and GitHub Actions.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.5.0
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- A GCP project with billing enabled
- A GitHub repository for this project

## Quick Start

### 1. Authenticate with GCP

```bash
gcloud auth login
gcloud auth application-default login
```

### 2. Configure Terraform Variables

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
project_id  = "your-gcp-project-id"
region      = "us-central1"
github_repo = "your-username/tech-fase-4-front"
api_url       = "https://your-api.run.app"
signaling_url = "https://your-signaling.run.app"
```

### 3. Initialize and Apply Terraform

```bash
terraform init
terraform plan
terraform apply
```

### 4. Configure GitHub Repository

After Terraform completes, copy the outputs to your GitHub repository settings.

Go to **Settings > Secrets and variables > Actions > Variables** and add:

| Variable Name | Value (from Terraform output) |
|--------------|-------------------------------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_REGION` | `us-central1` (or your chosen region) |
| `GCP_SERVICE_NAME` | `medical-triage-ui` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | `github-actions-deploy@PROJECT_ID.iam.gserviceaccount.com` |
| `API_URL` | Your backend API URL |
| `SIGNALING_URL` | Your WebRTC signaling URL |

### 5. Deploy

Push to `main` branch or manually trigger the deploy workflow:

```bash
git push origin main
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                            │
│  ┌──────────┐    ┌──────────┐    ┌─────────────────────────┐   │
│  │   Test   │───▶│  Build   │───▶│  Deploy to Cloud Run    │   │
│  └──────────┘    └──────────┘    └─────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ Workload Identity Federation
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Google Cloud Platform                        │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │ Artifact Registry │    │           Cloud Run              │  │
│  │   Docker Images   │───▶│   medical-triage-ui (Angular)   │  │
│  └──────────────────┘    └──────────────────────────────────┘  │
│                                         │                       │
│                                         │ API calls             │
│                                         ▼                       │
│                          ┌──────────────────────────────────┐  │
│                          │    Backend Services (API/WS)      │  │
│                          └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Cost Estimation

With default settings (scale to zero, 256MB memory):

| Resource | Monthly Cost (estimated) |
|----------|-------------------------|
| Cloud Run | $0 - $10 (pay per request) |
| Artifact Registry | ~$0.10/GB stored |
| **Total** | **< $15/month** for low traffic |

Tips to minimize costs:
- `min_instances = 0` enables scale-to-zero
- `cpu_idle = true` reduces CPU when idle
- Artifact Registry cleanup policies remove old images

## Remote State (Optional)

For team collaboration, enable remote state storage:

1. Create a GCS bucket:
```bash
gsutil mb -p YOUR_PROJECT_ID gs://YOUR_PROJECT_ID-terraform-state
gsutil versioning set on gs://YOUR_PROJECT_ID-terraform-state
```

2. Uncomment the backend block in `backend.tf`:
```hcl
terraform {
  backend "gcs" {
    bucket = "YOUR_PROJECT_ID-tfstate"
    prefix = "medical-triage-ui/state"
  }
}
```

3. Re-initialize Terraform:
```bash
terraform init -migrate-state
```

## Troubleshooting

### "Permission denied" during Terraform apply

Ensure you have the required IAM roles:
- `roles/run.admin`
- `roles/artifactregistry.admin`
- `roles/iam.workloadIdentityPoolAdmin`
- `roles/iam.serviceAccountAdmin`

### GitHub Actions authentication fails

1. Verify the Workload Identity Provider is correctly configured
2. Check that `github_repo` variable matches your repo exactly (case-sensitive)
3. Ensure the workflow has `id-token: write` permission

### Cloud Run returns 503medical

1. Check Cloud Run logs: `gcloud run services logs read assisted-triage-ui`
2. Verify the container starts and nginx serves on port 4200
3. Ensure health probes are passing

## Files Reference

| File | Purpose |
|------|---------|
| `main.tf` | Provider config, APIs, Artifact Registry, Cloud Run service |
| `variables.tf` | Input variables |
| `workload-identity.tf` | GitHub Actions authentication (Workload Identity) |
| `outputs.tf` | Deployment URLs and configuration values |
| `backend.tf` | Remote state configuration (optional) |
| `terraform.tfvars.example` | Variable template (copy to terraform.tfvars) |
