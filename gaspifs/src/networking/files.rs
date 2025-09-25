use anyhow::Result;
use reqwest::{Client as URLClient, header};

/// Lists all files in a specified project.
/// # Arguments
/// * `api` - The base URL of the API.
/// * `project` - The name of the project. If `None`, lists files in user space.
/// * `token` - The authentication token.
/// # Returns
/// A `Result` containing a vector of file names if successful, or an error if the request fails.
/// # Example
/// ```
/// let files = list_project_files("https://api.example.com", Some("my_project"), "my_token").await?;
/// for file in files {
///     println!("File: {}", file);
/// }
/// ```
pub async fn list_project_files(
    api: &str,
    project: Option<&str>,
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
            "mode": "files",
            "project": project
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "Failed to list files for project '{}': {}",
            project.unwrap_or("User Space"),
            response.text().await?
        ));
    }

    Ok(response.json().await?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::Server;

    #[tokio::test]
    async fn test_list_project_files() {
        let mut server = Server::new_async().await;
        let mock = server
            .mock("POST", "/dportal/cli")
            .match_body(mockito::Matcher::Json(serde_json::json!({
                "mode": "files",
                "project": "project1"
            })))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"["file1.txt", "file2.txt"]"#)
            .create();

        assert!(
            list_project_files(&server.url(), Some("project1"), "test_token")
                .await
                .is_ok()
        );
        mock.assert();
    }
}
