resource "aws_sqs_queue" "batch_submit_dlq" {
  name                      = "pgxflow-backend-batchSubmitDLQ"
  message_retention_seconds = 1209600 # 14 days

  tags = var.common-tags
}

resource "aws_sqs_queue" "batch_submit_queue" {
  name = "pgxflow-backend-batchSubmitQueue"

  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 20

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.batch_submit_dlq.arn
    maxReceiveCount     = 3
  })

  tags = var.common-tags
}
