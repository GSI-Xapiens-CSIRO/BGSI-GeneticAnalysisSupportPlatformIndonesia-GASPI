data "external" "source_hash" {
  program = ["python", "source_hash.py"]
  query = {
    source = "./src/"
  }
  working_dir = path.module
}

resource "null_resource" "gaspifs-upload" {
  triggers = {
    source_hash      = data.external.source_hash.result.hash
    cargo_toml_hash  = filesha1("${path.module}/Cargo.toml")
    cargo_lock_hash  = filesha1("${path.module}/Cargo.lock")
    docker_file_hash = filesha1("${path.module}/Dockerfile")
    docker_file_hash = filesha1("${path.module}/build_upload.sh")
  }

  provisioner "local-exec" {
    command = "/bin/bash \"${path.module}/build_upload.sh\" \"${path.module}\" \"${var.gaspifs_binary_destination}\" ${var.cli_backend_api_url} ${var.region} ${var.cognito_user_pool_client_id}"
  }
}
