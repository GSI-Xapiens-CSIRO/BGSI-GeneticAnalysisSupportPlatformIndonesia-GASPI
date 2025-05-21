# References table
resource "aws_dynamodb_table" "pgxflow_references" {
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  name         = var.pgxflow-references-table-name
  tags         = var.common-tags

  attribute {
    name = "id"
    type = "S"
  }
}
