use anyhow::Result;
use reqwest::{Client as URLClient, header};

/// Represents a project with its name and description.
/// This struct is used to deserialize the JSON response from the API when listing projects.
#[derive(serde::Deserialize)]
pub struct Project {
    pub name: String,
    pub description: String,
}

/// Lists all projects available in the API.
/// # Arguments
/// * `api` - The base URL of the API.
/// * `token` - The authentication token.
/// # Returns
/// A `Result` containing a vector of `Project` if successful, or an error if the request fails.
/// # Example
/// ```
/// let projects = list_projects("https://api.example.com", "my_token").await?;
/// for project in projects {
///     println!("Project: {}, Description: {}", project.name, project.description);
/// }
/// ```
pub async fn list_projects(api: &str, token: &str) -> Result<Vec<Project>> {
    let client = URLClient::new();
    let response = client
        .post(format!("{}/dportal/cli", api))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::ACCEPT, "*/*")
        .header(header::USER_AGENT, "gaspifs/1.0")
        .json(&serde_json::json!({
            "mode": "projects"
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "Failed to list projects: {}",
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
    async fn test_list_projects() {
        let mut server = Server::new_async().await;
        let mock = server
            .mock("POST", "/dportal/cli")
            .match_body(mockito::Matcher::Json(serde_json::json!({
                "mode": "projects"
            })))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"[{"name": "project1", "description": "First project"}, {"name": "project2", "description": "Second project"}]"#)
            .create();

        assert!(list_projects(&server.url(), "test_token").await.is_ok());
        mock.assert();
    }
}
