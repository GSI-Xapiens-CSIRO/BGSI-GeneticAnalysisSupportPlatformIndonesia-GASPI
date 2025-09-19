use super::util::parse_url;
use crate::networking::util::ErrorResponse;
use anyhow::{Ok, Result, anyhow};
use futures::stream::StreamExt;
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use reqwest::{Client as URLClient, header};
use std::path::Path;
use std::sync::Arc;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

/// Fetches download URLs for specified files in a project from the API.
/// # Arguments
/// * `api` - The base URL of the API.
/// * `project` - The name of the project, if None, lists files in user space.
/// * `files` - A list of file names to download.
/// * `token` - The authentication token.
/// # Returns
/// A vector of download URLs for the specified files.
/// # Errors
/// Returns an error if the API request fails or if the response cannot be parsed.
/// # Example
/// ```
/// let urls = get_download_urls("https://api.example.com", Some("my_project"), &["file1.txt".to_string(), "file2.txt".to_string()], "my_token").await?;
/// ```
pub async fn get_download_urls(
    api: &str,
    project: Option<&str>,
    files: &[String],
    token: &str,
) -> Result<Vec<String>> {
    let client = URLClient::new();
    let response = client
        .post(format!("{}/dportal/cli", api))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::ACCEPT, "*/*")
        .header(header::USER_AGENT, "gaspifs/1.0")
        .json(&serde_json::json!({
            "mode": "download",
            "project": project,
            "files": files
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

    let urls = response.json().await?;

    Ok(urls)
}

/// Downloads files from the provided URLs to the specified destination directory.
/// # Arguments
/// * `urls` - A slice of URLs to download.
/// * `destination` - The directory where the files will be saved.
/// # Returns
/// A `Result` indicating success or failure.
/// # Errors
/// Returns an error if any of the downloads fail or if file operations fail.
/// # Example
/// ```
/// let urls = vec!["https://example.com/file1.txt".to_string(), "https://example.com/file2.txt".to_string()];
/// let destination = "/path/to/destination";
/// download_files(&urls, destination).await?;
/// ```
pub async fn download_files(urls: &[String], destination: &str) -> Result<()> {
    let multi_progress = Arc::new(MultiProgress::new());
    let client = Arc::new(URLClient::new());

    let tasks: Vec<_> = urls
            .iter()
            .map(|url| {
                let (_, file_name) = parse_url(url).unwrap();
                let pb = multi_progress.add(ProgressBar::new(0));
                pb.set_style(
                    ProgressStyle::default_bar()
                        .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {bytes}/{total_bytes} ({eta}) {msg}")
                        .unwrap()
                        .progress_chars("#>-"),
                );
                pb.set_message(format!("Downloading {}", file_name));
                let client = Arc::clone(&client);
                tokio::spawn(download_file_with_progress(client, url.clone(), file_name, destination.into(), pb))
            })
            .collect();

    for task in tasks {
        task.await??;
    }

    Ok(())
}

/// Downloads a file from the specified URL and saves it to the destination directory with progress tracking.
/// # Arguments
/// * `client` - An instance of `URLClient` for making HTTP requests.
/// * `url` - The URL of the file to download.      
/// * `file_name` - The name of the file to save.
/// * `destination` - The directory where the file will be saved.
/// * `pb` - A `ProgressBar` instance for tracking download progress.
/// # Returns
/// A `Result` indicating success or failure.
/// # Errors
/// Returns an error if the download fails or if file operations fail.  
/// /// # Example
/// ```
/// let client = URLClient::new();
/// let url = "https://example.com/file.txt".to_string();
/// let file_name = "file.txt".to_string();
/// let destination = "/path/to/destination".to_string();
/// let pb = ProgressBar::new(0);
/// download_file_with_progress(client, url, file_name, destination, pb).await?;
/// ```
async fn download_file_with_progress(
    client: Arc<URLClient>,
    url: String,
    file_name: String,
    destination: String,
    pb: ProgressBar,
) -> Result<()> {
    let destination_path = Path::new(&destination).join(file_name.clone());
    let response = client.get(url).send().await?;
    let total_size = response.content_length().unwrap_or(0);
    let mut file = File::create(&destination_path).await?;
    let mut downloaded = 0u64;
    let mut stream = response.bytes_stream();

    pb.set_length(total_size);

    while let Some(item) = stream.next().await {
        let chunk = item?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;
        pb.set_position(downloaded);
    }

    pb.finish_with_message(format!("✓ {}", file_name));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::Server;

    #[tokio::test]
    async fn test_download_files() {
        let urls = vec![
            "https://github.com/GSI-Xapiens-CSIRO/GASPI-ETL-notebooks/raw/refs/heads/main/Variantspark-hipster-example/hipster.vcf.gz".to_string(),
            "https://github.com/GSI-Xapiens-CSIRO/GASPI-ETL-notebooks/raw/refs/heads/main/data/BGSI%20synthetic%20data/demo_metadata.json".to_string(),
        ];
        let destination = "/tmp/";

        assert!(download_files(&urls, destination).await.is_ok());
    }

    #[tokio::test]
    async fn test_get_download_urls() {
        let mut server = Server::new_async().await;
        let mock = server.mock("POST", "/dportal/cli")
            .match_body(mockito::Matcher::Json(serde_json::json!({
                "mode": "download",
                "project": "test_project",
                "files": ["file1.txt", "file2.txt"]
            })))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"[ "https://github.com/GSI-Xapiens-CSIRO/GASPI-ETL-notebooks/raw/refs/heads/main/Variantspark-hipster-example/hipster.vcf.gz", "https://github.com/GSI-Xapiens-CSIRO/GASPI-ETL-notebooks/raw/refs/heads/main/data/BGSI%20synthetic%20data/demo_metadata.json" ]"#)
            .create();

        assert!(
            get_download_urls(
                &server.url(),
                Some("test_project"),
                &["file1.txt".to_string(), "file2.txt".to_string()],
                "my_token",
            )
            .await
            .is_ok()
        );
        mock.assert();
    }

    #[tokio::test]
    async fn test_get_download_urls_non_existent() {
        let mut server = Server::new_async().await;
        let mock = server
            .mock("POST", "/dportal/cli")
            .match_body(mockito::Matcher::Json(serde_json::json!({
                "mode": "download",
                "project": "test_project",
                "files": ["nonexistent.txt"]
            })))
            .with_status(404)
            .with_header("content-type", "application/json")
            .with_body(r#"{ "error": 404, "message": "File not found" }"#)
            .create();

        let res = get_download_urls(
            &server.url(),
            Some("test_project"),
            &["nonexistent.txt".to_string()],
            "my_token",
        )
        .await;
        assert!(res.is_err());
        mock.assert();
    }
}
