resource "aws_s3_bucket" "documents" {
  bucket = "coauthor-documents-farhan"
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── Lambda: scan-document ─────────────────────────────────────────────────────

data "archive_file" "scan_document" {
  type        = "zip"
  source_file = "${path.module}/../lambda/scanDocument.js"
  output_path = "${path.module}/scan_document.zip"
}

resource "aws_iam_role" "lambda_scan" {
  name = "coauthor-lambda-scan-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_scan_basic" {
  role       = aws_iam_role.lambda_scan.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "scan_document" {
  function_name    = "coauthor-scan-document"
  role             = aws_iam_role.lambda_scan.arn
  handler          = "scanDocument.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.scan_document.output_path
  source_code_hash = data.archive_file.scan_document.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      OPENAI_API_KEY = var.openai_api_key
      OPENAI_MODEL   = "gpt-4o-mini"
    }
  }
}
