# 🚀 GCP Deployment Setup - Quick Start

## Changes Made

### 1. Docker Configuration
- **[Dockerfile](Dockerfile)**
  - ✅ Multi-stage build with Node 24.12.0 and nginx alpine
  - ✅ Exposes port `4200` for Cloud Run
  - ✅ Runs as non-root user (nginx)
  - ✅ Supports build-time environment injection via `ARG API_URL` and `ARG SIGNALING_URL`

### 2. Nginx Configuration
- **[nginx.conf](nginx.conf)**
  - ✅ Configured for Angular SPA routing (`try_files $uri $uri/ /index.html`)
  - ✅ All temp paths in `/tmp/` (Cloud Run compatible)
  - ✅ Gzip compression enabled
  - ✅ Static asset caching with `immutable` headers

### 3. Infrastructure as Code (Terraform)
- **[infra/main.tf](infra/main.tf)** - Core infrastructure (Cloud Run, Artifact Registry)
- **[infra/variables.tf](infra/variables.tf)** - Configuration variables
- **[infra/outputs.tf](infra/outputs.tf)** - Export values for GitHub Actions
- **[infra/workload-identity.tf](infra/workload-identity.tf)** - Secure GitHub Actions authentication
- **[infra/backend.tf](infra/backend.tf)** - Remote state configuration (optional)
- **[infra/terraform.tfvars.example](infra/terraform.tfvars.example)** - Example configuration

### 4. CI/CD Pipeline
- **[.github/workflows/deploy.yml](.github/workflows/deploy.yml)** - Automated deployment workflow
  - Runs tests with Karma + Jasmine
  - Builds Docker image with environment variables
  - Pushes to Artifact Registry
  - Deploys to Cloud Run
  - Manual trigger via GitHub Actions UI

### 5. Environment Configuration
- **Backend API URLs** configured via Docker build arguments
- No sensitive data in repository (all via GitHub variables)

### 6. Documentation
- **[infra/README.md](infra/README.md)** - Complete setup guide with commands
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - Project documentation

### 7. Version Control
- **[infra/.gitignore](infra/.gitignore)** - Terraform state and variable files excluded

---

## Next Steps (Do This Before First Deploy)

### Step 1: Ensure Backend is Deployed First
Before deploying the frontend, make sure your backend API is deployed and you have:
- ✅ Backend API URL (e.g., `https://medical-triage-xxxx.run.app`)
- ✅ WebRTC Signaling URL (e.g., `https://signaling-service-xxxx.run.app`)

These URLs will be baked into the frontend build.

### Step 2: Create GCP Project (if not exists)
```powershell
# Set your project ID
$PROJECT_ID = "medical-triage-prod"

# Create project (skip if exists)
gcloud projects create $PROJECT_ID --name="Medical Triage Production"

# Set as active
gcloud config set project $PROJECT_ID

# Link billing (replace BILLING_ACCOUNT_ID with your actual billing account)
gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### Step 3: Authenticate
```powershell
gcloud auth login
gcloud auth application-default login
```

### Step 4: Configure Terraform
```powershell
cd infra

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars

# Set these values:
# project_id    = "medical-triage-prod"                # Your GCP project ID
# github_repo   = "yourusername/tech-fase-4-front"    # Your GitHub repo
# api_url       = "https://your-backend-api.run.app"  # Your backend API URL
# signaling_url = "https://your-signaling.run.app"    # Your signaling URL
```

### Step 5: Deploy Infrastructure
```powershell
# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply (creates all infrastructure)
terraform apply
# Type 'yes' when prompted
```

### Step 6: Configure GitHub Variables
```powershell
# Get values from Terraform
terraform output
```

Go to **GitHub → Settings → Secrets and variables → Actions → Variables** and add:

| Variable Name | Value | Source |
|--------------|-------|--------|
| `GCP_PROJECT_ID` | Your project ID | e.g., `medical-triage-prod` |
| `GCP_REGION` | Region | `us-central1` (or your chosen region) |
| `GCP_SERVICE_NAME` | Service name | `medical-triage-ui` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider | From `terraform output workload_identity_provider` |
| `GCP_SERVICE_ACCOUNT` | Service account | From `terraform output service_account_email` |
| `API_URL` | Backend API | Your backend Cloud Run URL |
| `SIGNALING_URL` | Signaling service | Your signaling Cloud Run URL |

**Note:** These are **Variables**, not Secrets (they're not sensitive and will be baked into the public JS bundle).

### Step 7: Deploy Application

#### Option A: Automatic Deployment (Push to Main)
```powershell
git add .
git commit -m "Add GCP deployment configuration"
git push origin main
```

The workflow will automatically:
1. Run tests
2. Build Docker image with API URLs
3. Push to Artifact Registry
4. Deploy to Cloud Run

#### Option B: Manual Deployment
1. Go to **GitHub → Actions** tab
2. Select **"Deploy to Cloud Run"** workflow
3. Click **"Run workflow"** → Select `main` branch → **"Run workflow"**

### Step 8: Verify Deployment
```powershell
# Get your service URL
terraform output service_url

# Test the deployment
$URL = terraform output -raw service_url
curl $URL

# Check logs
gcloud run services logs tail medical-triage-ui --region=us-central1
```

**Expected response:** HTML content from your Angular app

---

## Cost Estimate

**For a low-traffic MVP:**
- Cloud Run: $0/month (2M requests free, auto-scales to zero)
- Artifact Registry: $0.10-0.50/month (storage for images)
- Network egress: $0-2/month (first 1GB free)

**Total: ~$0-5/month** (most likely free tier)

Cloud Run scales to zero when not in use, so you only pay for actual usage!

**Cost optimization settings (already configured):**
- ✅ `min_instances = 0` - Scale to zero when idle
- ✅ `cpu_idle = true` - Reduce CPU when idle
- ✅ `memory = 256Mi` - Minimal memory for static content
- ✅ Artifact Registry cleanup policies - Auto-delete old images

---

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
│  │   (nginx:alpine)  │    │        Port 4200, HTTPS         │  │
│  └──────────────────┘    └──────────────────────────────────┘  │
│                                         │                       │
│                                         │ API calls             │
│                                         ▼                       │
│                          ┌──────────────────────────────────┐  │
│                          │    Backend Services (API/WS)      │  │
│                          │  - Medical Triage API (8080)      │  │
│                          │  - WebRTC Signaling (8000)        │  │
│                          └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Development Workflow

### Local Development
```powershell
# Install dependencies
npm ci

# Start dev server (uses localhost:8080 for API)
npm start

# Run tests
npm test

# Build production bundle
npm run build
```

### Test Docker Build Locally
```powershell
# Build with production URLs
docker build `
  --build-arg API_URL=https://your-api.run.app `
  --build-arg SIGNALING_URL=https://your-signaling.run.app `
  -t medical-triage-ui .

# Run locally
docker run -p 4200:4200 medical-triage-ui

# Test
curl http://localhost:4200
```

### Update Backend URLs
If your backend URLs change:

1. Update `infra/terraform.tfvars`:
   ```hcl
   api_url       = "https://new-api-url.run.app"
   signaling_url = "https://new-signaling-url.run.app"
   ```

2. Update GitHub variables:
   - Go to **Settings → Secrets and variables → Actions → Variables**
   - Update `API_URL` and `SIGNALING_URL`

3. Trigger a new deployment (push to main or manual workflow run)

---

## Troubleshooting

### ❌ Terraform Apply Fails with "API not enabled"
```powershell
# Manually enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable iamcredentials.googleapis.com

# Wait 1-2 minutes, then retry
terraform apply
```

### ❌ GitHub Actions: "Permission denied" during deploy
**Issue:** Workload Identity Federation not configured correctly

**Solution:**
1. Verify `github_repo` in `terraform.tfvars` matches exactly (case-sensitive):
   ```hcl
   github_repo = "YourUsername/tech-fase-4-front"  # Must match GitHub
   ```

2. Reapply Terraform:
   ```powershell
   terraform apply
   ```

3. Update GitHub variable `GCP_WORKLOAD_IDENTITY_PROVIDER` with new output

### ❌ Application Shows "Failed to load API"
**Issue:** Backend URLs are incorrect or backend not accessible

**Solution:**
1. Check backend is deployed and accessible:
   ```powershell
   curl https://your-backend-api.run.app/actuator/health
   ```

2. Verify GitHub variables `API_URL` and `SIGNALING_URL` are correct

3. Check CORS configuration in backend allows frontend origin

4. Redeploy frontend with correct URLs

### ❌ Cloud Run Returns 502/503
**Issue:** Container failing to start

**Solution:**
1. Check logs:
   ```powershell
   gcloud run services logs tail medical-triage-ui --region=us-central1
   ```

2. Verify nginx starts correctly:
   ```powershell
   # Test locally
   docker run -p 4200:4200 medical-triage-ui
   ```

3. Check health probe configuration in [infra/main.tf](infra/main.tf)

### ❌ Tests Fail in GitHub Actions
**Issue:** ChromeHeadless not available in CI

**Solution:**
- Already configured in [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- Uses `--no-watch --browsers=ChromeHeadless` flags
- If issues persist, check [karma.conf.js](karma.conf.js) configuration

---

## Monitoring & Logs

### View Cloud Run Metrics
```powershell
# Open Cloud Run console
gcloud run services describe medical-triage-ui --region=us-central1

# View in browser
start "https://console.cloud.google.com/run/detail/us-central1/medical-triage-ui"
```

### Stream Logs
```powershell
# Real-time logs
gcloud run services logs tail medical-triage-ui --region=us-central1

# Last 50 entries
gcloud run services logs read medical-triage-ui --region=us-central1 --limit=50
```

### Performance Monitoring
Cloud Run automatically tracks:
- ✅ Request count
- ✅ Request latency (p50, p95, p99)
- ✅ Container CPU utilization
- ✅ Container memory utilization
- ✅ Instance count (scaling)

Access via: **Cloud Console → Cloud Run → medical-triage-ui → Metrics**

---

## Security Notes

✅ **Secure by default:**
- No long-lived service account keys
- Workload Identity Federation for GitHub Actions
- HTTPS-only endpoints (automatic TLS)
- Non-root container user (nginx)
- Automatic security updates for base images
- Public access controlled (suitable for public-facing UI)

⚠️ **Production considerations:**
- Backend API URLs are **public** (visible in JavaScript bundle)
- Ensure backend implements proper authentication/authorization
- Backend must configure CORS to allow requests from Cloud Run URL
- Consider Cloud CDN for global performance
- Consider Cloud Armor for DDoS protection
- Set up uptime monitoring and alerting

---

## Next Steps: Post-Deployment

### 1. Configure Custom Domain (Optional)
```powershell
# Map custom domain to Cloud Run
gcloud run domain-mappings create --service=medical-triage-ui --domain=app.yourdomain.com
```

### 2. Set Up CORS in Backend
Add your frontend URL to backend CORS configuration:
```yaml
# Backend application.yaml
cors:
  allowed-origins:
    - https://medical-triage-ui-xxxx-uc.a.run.app
    - https://app.yourdomain.com  # If using custom domain
```

### 3. Enable Cloud Armor (Optional)
For DDoS protection and rate limiting:
```powershell
# Create security policy
gcloud compute security-policies create frontend-policy `
  --description "Security policy for frontend"

# Add rate limiting rule
gcloud compute security-policies rules create 1000 `
  --security-policy frontend-policy `
  --expression "true" `
  --action "rate-based-ban" `
  --rate-limit-threshold-count 100 `
  --rate-limit-threshold-interval-sec 60
```

### 4. Set Up Monitoring Alerts
Create alerts for:
- High error rate (5xx responses)
- High latency (p99 > 1s)
- Low instance count (service down)

---

## Support

- 📖 **Full setup guide:** [infra/README.md](infra/README.md)
- 🐛 **Troubleshooting:** See troubleshooting section above
- 📝 **Logs:** `gcloud run services logs tail medical-triage-ui --region=us-central1`
- 💬 **GitHub Issues:** Report bugs or request features

---

## Summary: Quick Deploy Checklist

- [ ] Backend services deployed and accessible
- [ ] GCP project created and billing enabled
- [ ] Authenticated with `gcloud auth login`
- [ ] Terraform variables configured (`terraform.tfvars`)
- [ ] Infrastructure deployed (`terraform apply`)
- [ ] GitHub variables configured (7 variables)
- [ ] Code pushed to `main` branch or manual workflow triggered
- [ ] Deployment successful (check GitHub Actions)
- [ ] Service accessible (test Cloud Run URL)
- [ ] Backend CORS configured for frontend URL
- [ ] Application works end-to-end

---

**Everything is ready! Follow the steps above to deploy your Angular frontend to GCP.** 🎉
