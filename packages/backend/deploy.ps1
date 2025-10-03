param(
  [Parameter(Mandatory=$true)][string]$ProjectId,
  [Parameter(Mandatory=$true)][string]$Region,
  [Parameter(Mandatory=$true)][string]$InstanceConnName # e.g. retail-oms-saas:asia-south1:omsms-db
)

$Service="omsms-backend"
$Image="gcr.io/$ProjectId/$Service:latest"

Write-Host "Enabling APIs..."
gcloud services enable run.googleapis.com sqladmin.googleapis.com iam.googleapis.com

Write-Host "Building image..."
gcloud builds submit --tag $Image packages/backend

Write-Host "Deploying Cloud Run..."
gcloud run deploy $Service `
  --image $Image `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --add-cloudsql-instances $InstanceConnName `
  --set-env-vars NODE_ENV=production `
  --set-env-vars MASTER_DATABASE_URL="postgresql://omsms_admin:${env:DB_PASSWORD}@/omsms_master?host=/cloudsql/$InstanceConnName&schema=public" `
  --set-env-vars JWT_SECRET="${env:JWT_SECRET}" `
  --set-env-vars PORT=8080

Write-Host "Done. Service URL:"
gcloud run services describe $Service --region $Region --format='value(status.url)'
