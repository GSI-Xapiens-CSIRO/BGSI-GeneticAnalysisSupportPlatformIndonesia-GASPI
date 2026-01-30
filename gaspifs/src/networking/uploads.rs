use super::util::get_file_name_from_path;
use crate::networking::util::{ErrorResponse, get_file_sizes};
use anyhow::{Result, anyhow};
use futures::StreamExt;
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use reqwest::{Client as URLClient, header, multipart};
use std::sync::Arc;
use tokio::fs::File;
use tokio_util::io::ReaderStream;

/// Represents the fields required for uploading files to S3.
/// This struct is used to deserialize the JSON response from the API when requesting upload URLs.
/// It contains the necessary fields such as key, policy, algorithm, signature, credential, date, and security token.
/// The fields are renamed to match the expected names in the S3 upload form.
#[derive(Debug, serde::Deserialize)]
pub struct Fields {
    key: String,
    policy: String,
    #[serde(rename = "x-amz-algorithm")]
    algorithm: String,
    #[serde(rename = "x-amz-signature")]
    signature: String,
    #[serde(rename = "x-amz-credential")]
    credential: String,
    #[serde(rename = "x-amz-date")]
    date: String,
    #[serde(rename = "x-amz-security-token")]
    token: String,
}

/// Represents an upload URL and its associated fields.
/// This struct is used to deserialize the JSON response from the API when requesting upload URLs.
/// It contains the URL to which files should be uploaded and the fields required for the upload form
#[derive(serde::Deserialize)]
pub struct UploadURL {
    url: String,
    fields: Fields,
}

/// Fetches upload URLs for specified files in a project from the API.
/// # Arguments
/// * `api` - The base URL of the API.
/// * `project` - The name of the project, if None, uploads to user space.
/// * `files` - A list of file names to upload.
/// * `token` - The authentication token.
/// # Returns
/// A vector of `UploadURL` containing the URLs and fields required for uploading files.
/// # Errors
/// Returns an error if the API request fails or if the response cannot be parsed.
/// # Example
/// ```
/// let urls = get_upload_urls("https://api.example.com", Some("my_project"), &["file1.txt".to_string(), "file2.txt".to_string()], "my_token").await?;
/// for url in urls {
///     println!("Upload URL: {}, Fields: {:?}", url.url, url.fields);
/// }
/// ```
pub async fn get_upload_urls(
    api: &str,
    project: Option<&str>,
    files: &[String],
    token: &str,
) -> Result<Vec<UploadURL>> {
    let client = URLClient::new();
    let file_sizes = get_file_sizes(files)?;
    let response = client
        .post(format!("{}/dportal/cli", api))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::ACCEPT, "*/*")
        .header(header::USER_AGENT, "gaspifs/1.0")
        .json(&serde_json::json!({
            "mode": "upload",
            "project": project,
            "files": files.iter().map(|file| get_file_name_from_path(file).unwrap()).collect::<Vec<String>>(),
            "sizes": file_sizes,
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let error: ErrorResponse = response.json().await?;
        return Err(anyhow!(format!(
            "API error {}: {}",
            error.error, error.message
        )));
    }

    let urls: Vec<UploadURL> = response.json().await?;

    Ok(urls)
}

/// Uploads files to the specified URLs with progress tracking.
/// # Arguments
/// * `urls` - A vector of `UploadURL` containing the URLs and fields for uploading files.
/// * `file_paths` - A slice of file paths to upload.
/// # Returns
/// A `Result` indicating success or failure.
/// # Errors
/// Returns an error if any of the uploads fail or if file operations fail.
/// # Example
/// ```
/// let urls = vec![
///     UploadURL {
///         url: "https://example.com/upload".to_string(),
///         fields: Fields {
///             key: "private/uploads/file1.txt".to_string(),
///             algorithm: "AWS4-HMAC-SHA256".to_string(),
///             credential: "CRED".to_string(),
///             date: "20250709T042302Z".to_string(),
///             token: "TOKEN".to_string(),
///             policy: "POL".to_string(),
///             signature: "123123123".to_string(),
///        },
///    },
///    UploadURL {
///         url: "https://example.com/upload".to_string(),
///         fields: Fields {
///             key: "private/uploads/file2.txt".to_string(),
///             algorithm: "AWS4-HMAC-SHA256".to_string(),
///             credential: "CRED".to_string(),
///             date: "20250709T042302Z".to_string(),
///             token: "TOKEN".to_string(),
///             policy: "POL".to_string(),
///             signature: "123123123".to_string(),
///         },
///    },
/// ]
/// let file_paths = vec![
///     "/path/to/file1.txt".to_string(),
///     "/path/to/file2.txt".to_string(),
/// ];
/// upload_files(urls, &file_paths).await?;
/// for url in urls {
///     println!("Uploaded to: {}", url.url);
/// }
/// ```
pub async fn upload_files(urls: Vec<UploadURL>, file_paths: &[String]) -> Result<()> {
    let multi_progress = Arc::new(MultiProgress::new());
    let upload_futures = urls
            .into_iter()
            .zip(file_paths.iter())
            .map(|(url, file_path)| {
                let file_path = file_path.clone();
                let multi_progress = multi_progress.clone();

                tokio::spawn(async move {
                    let file_name = get_file_name_from_path(&file_path).unwrap();
                    let pb = multi_progress.add(ProgressBar::new(0));
                    pb.set_style(
                        ProgressStyle::default_bar()
                            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {bytes}/{total_bytes} ({eta}) {msg}")
                            .unwrap()
                        .progress_chars("#>-"),
                );
                pb.set_message(format!("uploading {}", file_name));

                upload_file_with_progress(url, &file_path, pb).await
            })
        });
    futures::future::try_join_all(upload_futures).await?;

    Ok(())
}

/// Uploads a file to the specified URL with progress tracking.
/// # Arguments
/// * `url` - The `UploadURL` containing the URL and fields for uploading the file.
/// * `file_path` - The path to the file to upload.
/// * `pb` - A `ProgressBar` instance for tracking upload progress.
/// # Returns
/// A `Result` indicating success or failure.
/// # Errors
/// Returns an error if the upload fails or if file operations fail.
/// # Example
/// ```
/// let url = UploadURL {
///     url: "https://example.com/upload".to_string(),
///     fields: Fields {
///         key: "private/uploads/file.txt".to_string(),
///         algorithm: "AWS4-HMAC-SHA256".to_string(),
///         credential: "CRED".to_string(),
///         date: "20250709T042302Z".to_string(),
///         token: "TOKEN".to_string(),
///         policy: "POL".to_string(),
///         signature: "123123123".to_string(),
///      },
/// };
/// let file_path = "/path/to/file.txt";
/// let pb = ProgressBar::new(0);
/// upload_file_with_progress(url, file_path, pb).await?;
/// ```
async fn upload_file_with_progress(url: UploadURL, file_path: &str, pb: ProgressBar) -> Result<()> {
    let file_name = get_file_name_from_path(file_path)?;
    let client = URLClient::new();
    let file = File::open(file_path).await?;
    let total_size = file.metadata().await?.len();

    pb.set_length(total_size);
    let pb2 = pb.clone();

    let reader_stream = ReaderStream::new(file);
    let stream = reader_stream.map(move |chunk| {
        if let Ok(chunk) = &chunk {
            pb2.inc(chunk.len() as u64);
        }
        chunk
    });
    let body = reqwest::Body::wrap_stream(stream);

    let file_part = multipart::Part::stream_with_length(body, total_size)
        .file_name(file_name.clone())
        .mime_str("application/octet-stream")
        .map_err(|e| anyhow!("Failed to create file part: {}", e))?;

    let form = multipart::Form::new()
        .text("key", url.fields.key.clone())
        .text("policy", url.fields.policy.clone())
        .text("x-amz-signature", url.fields.signature.clone())
        .text("x-amz-algorithm", url.fields.algorithm.clone())
        .text("x-amz-credential", url.fields.credential.clone())
        .text("x-amz-date", url.fields.date.clone())
        .text("x-amz-security-token", url.fields.token.clone())
        .part("file", file_part);

    // Send the upload request
    let response = client
        .post(&url.url)
        .multipart(form)
        // .header(header::CONTENT_LENGTH, total_size)
        // .header(header::CONTENT_TYPE, "binary/octet-stream")
        .send()
        .await?;

    if response.status().is_success() {
        pb.finish_with_message(format!("✓ {}", file_name));
        Ok(())
    } else {
        let status = response.status();
        pb.finish_with_message(format!("✗ {} ({})", file_name, status));
        Err(anyhow!("Upload failed with status: {}", status))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::{Matcher, Server};
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[tokio::test]
    async fn test_upload_files() {
        let mut server = Server::new_async().await;
        let mock = server
            .mock("POST", "/")
            .match_header(
                "content-type",
                Matcher::Regex("multipart/form-data.*".into()),
            )
            .with_status(200)
            .with_body(r#"{}"#)
            .expect(2)
            .create();

        let urls = vec![
            UploadURL {
                url: server.url(),
                fields: Fields {
                    key: "private/asdasd/uploads/asdasdasd/asdasdasd.vcf.gz".to_string(),
                    algorithm: "AWS4-HMAC-SHA256".to_string(),
                    credential: "CRED".to_string(),
                    date: "20250709T042302Z".to_string(),
                    token: "TOKEN".to_string(),
                    policy: "POL".to_string(),
                    signature: "123123123".to_string(),
                },
            },
            UploadURL {
                url: server.url(),
                fields: Fields {
                    key: "private/asdasd/uploads/asdasdasd/asdasdasd.vcf.gz".to_string(),
                    algorithm: "AWS4-HMAC-SHA256".to_string(),
                    credential: "CRED".to_string(),
                    date: "20250709T042302Z".to_string(),
                    token: "TOKEN".to_string(),
                    policy: "POL".to_string(),
                    signature: "123123123".to_string(),
                },
            },
        ];

        let x_bytes = 1_048_576; // 1MB
        let mut tmp1 = NamedTempFile::new_in("/tmp").unwrap();
        tmp1.as_file_mut().set_len(x_bytes).unwrap();
        let mut tmp2 = NamedTempFile::new_in("/tmp").unwrap();
        tmp2.as_file_mut().set_len(x_bytes).unwrap();

        assert!(
            upload_files(
                urls,
                &[
                    tmp1.path().to_str().unwrap().into(),
                    tmp2.path().to_str().unwrap().into(),
                ],
            )
            .await
            .is_ok()
        );
        mock.assert();
    }

    #[tokio::test]
    async fn test_get_upload_urls() {
        let mut file_1 = NamedTempFile::new().unwrap();
        write!(file_1, "1234").unwrap();
        let mut file_2 = NamedTempFile::new().unwrap();
        write!(file_2, "456789").unwrap();
        let paths = [
            file_1.path().to_str().unwrap().to_string(),
            file_2.path().to_str().unwrap().to_string(),
        ];
        let names = paths
            .iter()
            .map(|file| get_file_name_from_path(file).unwrap())
            .collect::<Vec<String>>();

        let mut server = Server::new_async().await;
        let mock = server
            .mock("POST", "/dportal/cli")
            .match_body(mockito::Matcher::Json(serde_json::json!({
                "mode": "upload",
                "project": "test_project",
                "files": names,
                "sizes": [4, 6]
            })))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(
                r#"[
                {
                    "url": "https://amzn-s3-demo-bucket.s3.amazonaws.com",
                    "fields": {
                        "key": "private/asdasd/uploads/asdasdasd/asdasdasd.vcf.gz",
                        "x-amz-algorithm": "AWS4-HMAC-SHA256",
                        "x-amz-credential": "CRED",
                        "x-amz-date": "20250709T042302Z",
                        "x-amz-security-token": "TOKEN",
                        "policy": "POL",
                        "x-amz-signature": "123123123"
                    }
                },
                {
                    "url": "https://amzn-s3-demo-bucket.s3.amazonaws.com",
                    "fields": {
                        "key": "private/asdasd/uploads/asdasdasd/asdasdasd.vcf.gz",
                        "x-amz-algorithm": "AWS4-HMAC-SHA256",
                        "x-amz-credential": "CRED",
                        "x-amz-date": "20250709T042302Z",
                        "x-amz-security-token": "TOKEN",
                        "policy": "POL",
                        "x-amz-signature": "123123123"
                    }
                }
            ]"#,
            )
            .create();

        println!("Server URL: {}", server.url());

        assert!(
            get_upload_urls(&server.url(), Some("test_project"), &paths, "my_token")
                .await
                .is_ok()
        );
        mock.assert();
        file_1.close().unwrap();
        file_2.close().unwrap();
    }
}
