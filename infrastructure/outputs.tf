output "bucket_name" {
  description = "S3 bucket name for document storage"
  value       = aws_s3_bucket.documents.id
}

output "bucket_arn" {
  description = "S3 bucket ARN — use in IAM policies"
  value       = aws_s3_bucket.documents.arn
}

output "lambda_function_name" {
  description = "scan-document Lambda function name"
  value       = aws_lambda_function.scan_document.function_name
}

output "lambda_function_arn" {
  description = "scan-document Lambda ARN"
  value       = aws_lambda_function.scan_document.arn
}

output "cloudfront_url" {
  description = "Frontend URL — open this in your browser"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_bucket" {
  description = "S3 bucket for frontend static assets — used in deploy-frontend workflow"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — used for cache invalidation in CI"
  value       = aws_cloudfront_distribution.frontend.id
}

output "alb_dns_name" {
  description = "Backend ALB DNS — set this as VITE_COLLAB_URL in GitHub secrets"
  value       = "http://${aws_lb.backend.dns_name}"
}

output "ecr_repository_url" {
  description = "ECR repo URL — used in deploy-backend workflow for docker push"
  value       = aws_ecr_repository.backend.repository_url
}
