#
# custom message lambda trigger
#
module "lambda-customMessageLambdaTrigger" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "cognito-customMessageLambdaTrigger"
  description   = "Sends a custom password reset email to the user"
  runtime       = "python3.12"
  handler       = "lambda_function.lambda_handler"
  memory_size   = 512
  timeout       = 24
  source_path   = "${path.module}/lambda/customMessageLambdaTrigger"
  tags          = var.common-tags
}

#
# registration email Lambda function
#
module "lambda-sendRegistrationEmail" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "cognito-sendRegistrationEmail"
  description         = "Sends registration email on user account creation"
  runtime             = "python3.12"
  handler             = "lambda_function.lambda_handler"
  memory_size         = 512
  timeout             = 60
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-sendRegistrationEmail.json,
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/sendRegistrationEmail"

  environment_variables = {
    BUI_SSM_PARAM_NAME  = var.bui-ssm-parameter-name
    SES_SOURCE_EMAIL    = var.ses-source-email
    SES_CONFIG_SET_NAME = aws_ses_configuration_set.ses_feedback_config.name
  }

  tags = var.common-tags
}

#
# submit clinic email Lambda function
#
module "lambda-sendClinicJobEmail" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "cognito-sendClinicJobEmail"
  description         = "Sends clinic status emails"
  runtime             = "python3.12"
  handler             = "lambda_function.lambda_handler"
  memory_size         = 512
  timeout             = 60
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-sendClinicJobEmail.json,
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/sendClinicJobEmail"

  environment_variables = {
    BUI_SSM_PARAM_NAME  = var.bui-ssm-parameter-name
    SES_SOURCE_EMAIL    = var.ses-source-email
    SES_CONFIG_SET_NAME = aws_ses_configuration_set.ses_feedback_config.name
  }

  tags = var.common-tags
}

#
# email notification Lambda function
#
module "lambda-logEmailDelivery" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "cognito-logEmailDelivery"
  description         = "Logging of user invite email delivery status."
  runtime             = "python3.12"
  handler             = "lambda_function.lambda_handler"
  memory_size         = 512
  timeout             = 60
  attach_policy_jsons = true
  source_path         = "${path.module}/lambda/logEmailDelivery"

  tags = var.common-tags
}

resource "aws_lambda_permission" "SNSemailNotification" {
  statement_id  = "CognitoBackendAllowSNSemailNotificationInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda-logEmailDelivery.lambda_function_arn
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.sesDeliveryLogger.arn
}
