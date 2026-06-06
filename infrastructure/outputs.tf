output "bucket_name" {
  description = "S3 bucket name — set as VITE_S3_BUCKET or pass to server"
  value       = aws_s3_bucket.documents.id
}

output "bucket_arn" {
  description = "S3 bucket ARN — use in IAM policies"
  value       = aws_s3_bucket.documents.arn
}

output "lambda_function_name" {
  description = "scan-document Lambda function name — used in server LAMBDA_FUNCTION_NAME"
  value       = aws_lambda_function.scan_document.function_name
}

output "lambda_function_arn" {
  description = "scan-document Lambda ARN"
  value       = aws_lambda_function.scan_document.arn
}
