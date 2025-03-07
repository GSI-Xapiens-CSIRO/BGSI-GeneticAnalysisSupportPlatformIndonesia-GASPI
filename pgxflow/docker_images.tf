#
# initFlow docker image
#
data "external" "initflow_lambda_source_hash" {
  program     = ["python", "lambda/initFlow/docker_prep.py"]
  working_dir = path.module
}

module "docker_image_initflow_lambda" {
  source = "terraform-aws-modules/lambda/aws//modules/docker-build"

  create_ecr_repo = true
  ecr_repo        = "pgxflow-initflow-lambda-containers"
  ecr_repo_lifecycle_policy = jsonencode({
    "rules" : [
      {
        "rulePriority" : 1,
        "description" : "Keep only the last 1 images",
        "selection" : {
          "tagStatus" : "any",
          "countType" : "imageCountMoreThan",
          "countNumber" : 1
        },
        "action" : {
          "type" : "expire"
        }
      }
    ]
  })
  use_image_tag = false
  source_path   = "${path.module}/lambda/initFlow"

  triggers = {
    dir_sha = data.external.initflow_lambda_source_hash.result.hash
  }

  platform = "linux/amd64"
}

#
# preprocessor docker image
#
data "external" "preprocessor_lambda_source_hash" {
  program     = ["python", "lambda/preprocessor/docker_prep.py"]
  working_dir = path.module
}

module "docker_image_preprocessor_lambda" {
  source = "terraform-aws-modules/lambda/aws//modules/docker-build"

  create_ecr_repo = true
  ecr_repo        = "pgxflow-preprocessor-lambda-containers"
  ecr_repo_lifecycle_policy = jsonencode({
    "rules" : [
      {
        "rulePriority" : 1,
        "description" : "Keep only the last 1 images",
        "selection" : {
          "tagStatus" : "any",
          "countType" : "imageCountMoreThan",
          "countNumber" : 1
        },
        "action" : {
          "type" : "expire"
        }
      }
    ]
  })
  use_image_tag = false
  source_path   = "${path.module}/lambda/preprocessor"

  triggers = {
    dir_sha = data.external.preprocessor_lambda_source_hash.result.hash
  }

  platform = "linux/amd64"
}

#
# pharmcat docker image
#
data "external" "pharmcat_lambda_source_hash" {
  program     = ["python", "lambda/pharmcat/docker_prep.py"]
  working_dir = path.module
}

module "docker_image_pharmcat_lambda" {
  source = "terraform-aws-modules/lambda/aws//modules/docker-build"
  
  create_ecr_repo = true
  ecr_repo        = "pgxflow-pharmcat-lambda-containers"
  ecr_repo_lifecycle_policy = jsonencode({
    "rules": [
      {
        "rulePriority" : 1,
        "description" : "Keep only the last 1 images",
        "selection" : {
          "tagStatus" : "any",
          "countType" : "imageCountMoreThan",
          "countNumber" : 1
        },
        "action" : {
          "type" : "expire"
        }
      }
    ]
  })
  use_image_tag = false
  source_path   = "${path.module}/lambda/pharmcat"

  triggers = {
    dir_sha = data.external.pharmcat_lambda_source_hash.result.hash
  }

  platform = "linux/amd64"
}