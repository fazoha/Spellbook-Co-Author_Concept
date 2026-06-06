variable "openai_api_key" {
  description = "OpenAI API key passed as an environment variable to the scan-document Lambda"
  type        = string
  sensitive   = true
}
