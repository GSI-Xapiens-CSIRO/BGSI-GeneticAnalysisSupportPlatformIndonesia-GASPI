use anyhow::{Result, anyhow};
use aws_config::{BehaviorVersion, Region};
use aws_sdk_cognitoidentityprovider::{
    Client,
    types::{AuthFlowType, ChallengeNameType},
};
use std::{
    env,
    fs::File,
    io::{self, Write},
    path::Path,
};

/// Logs out the user by removing the refresh token file from the home directory.
/// If the file does not exist, it informs the user that no active session was found.
/// # Returns
/// A `Result` indicating success or failure of the logout operation.
/// # Example
/// ```
/// logout().await?;
/// println!("Logged out successfully.");
/// ```
pub async fn logout() -> Result<()> {
    let mut path = home::home_dir().ok_or(anyhow!("Could not determine home directory."))?;
    path.push(".refresh_token.txt");
    let path = Path::new(&path);
    if path.exists() {
        std::fs::remove_file(path)?;
        println!("Logged out successfully.");
    } else {
        println!("No active session found.");
    }
    Ok(())
}

/// Logs in the user and retrieves access, ID, and refresh tokens.
/// If a refresh token is found in the home directory, it attempts to bypass the login process.
/// If the refresh token is invalid or not found, it prompts the user for their username and password.
/// The tokens are then saved to a file in the home directory for future use.
/// # Returns
/// A `Result` containing a tuple of access token, ID token, and refresh token if successful,
/// or an error if the login process fails.
/// # Example
/// ```
/// let (access_token, id_token, refresh_token) = login().await?;
/// println!("Access Token: {}", access_token);
/// println!("ID Token: {}", id_token);
/// println!("Refresh Token: {}", refresh_token);
/// ```
pub async fn login() -> Result<(String, String, String)> {
    let mut path = home::home_dir().ok_or(anyhow!("Could not determine home directory."))?;
    path.push(".refresh_token.txt");
    let path = Path::new(&path);
    let mut username: String = String::new();
    let password: String;

    if path.exists() {
        let refresh_token = std::fs::read_to_string(path)?;
        let Ok((access_token, id_token, refresh_token)) = bypass_login(refresh_token).await else {
            eprintln!("Failed to bypass login. Please log in again.");
            // login flow
            print!("Please enter your username: ");
            io::stdout().flush()?;
            std::io::stdin().read_line(&mut username)?;
            username = username.trim().to_lowercase();
            print!("Please enter your password: ");
            io::stdout().flush()?;
            password = rpassword::read_password()?;
            let (access_token, id_token, refresh_token) = perform_login(username, password).await?;
            // end login flow
            let mut file = File::create(path)?;
            file.write_all(refresh_token.as_bytes())?;
            return Ok((access_token, id_token, refresh_token));
        };
        return Ok((access_token, id_token, refresh_token));
    }
    // login flow
    print!("Please enter your username: ");
    io::stdout().flush()?;
    std::io::stdin().read_line(&mut username)?;
    username = username.trim().to_lowercase();
    print!("Please enter your password: ");
    io::stdout().flush()?;
    password = rpassword::read_password()?;
    let (access_token, id_token, refresh_token) = perform_login(username, password).await?;
    println!("Login successful!");
    // end login flow
    let mut file = File::create(path)?;
    file.write_all(refresh_token.as_bytes())?;
    Ok((access_token, id_token, refresh_token))
}

async fn perform_login(username: String, password: String) -> Result<(String, String, String)> {
    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(Region::new(env::var("AWS_REGION")?))
        .load()
        .await;
    let client = Client::new(&config);
    let client_id = env::var("COGNITO_CLIENT_ID")?;

    let auth_response = client
        .initiate_auth()
        .auth_flow(AuthFlowType::UserPasswordAuth)
        .client_id(client_id.clone())
        .set_auth_parameters(Some(
            [
                ("USERNAME".to_string(), username.clone()),
                ("PASSWORD".to_string(), password),
            ]
            .iter()
            .cloned()
            .collect(),
        ))
        .send()
        .await?;

    if let Some(authentication_result) = &auth_response.authentication_result {
        let access_token = authentication_result
            .access_token
            .as_ref()
            .ok_or(anyhow::anyhow!(
                "Access token not found in authentication result"
            ))?;
        let id_token = authentication_result
            .id_token
            .as_ref()
            .ok_or(anyhow::anyhow!(
                "ID token not found in authentication result"
            ))?;
        let refresh_token = authentication_result
            .refresh_token
            .as_ref()
            .ok_or(anyhow::anyhow!(
                "Refresh token not found in authentication result"
            ))?;
        Ok((
            access_token.clone(),
            id_token.clone(),
            refresh_token.clone(),
        ))
    } else if let Some(challenge_name) = auth_response.challenge_name() {
        if *challenge_name == ChallengeNameType::SoftwareTokenMfa {
            print!("MFA detected. Please enter your OTP code: ");
            io::stdout().flush()?;
            let totp_code = rpassword::read_password()?;
            let challenge_response = client
                .respond_to_auth_challenge()
                .client_id(client_id)
                .challenge_name(challenge_name.clone())
                .session(auth_response.session().unwrap())
                .set_challenge_responses(Some(
                    [
                        ("USERNAME".to_string(), username),
                        ("SOFTWARE_TOKEN_MFA_CODE".to_string(), totp_code.to_string()),
                    ]
                    .iter()
                    .cloned()
                    .collect(),
                ))
                .send()
                .await?;

            if let Some(authentication_result) = challenge_response.authentication_result() {
                let access_token =
                    authentication_result
                        .access_token
                        .as_ref()
                        .ok_or(anyhow::anyhow!(
                            "Access token not found in authentication result"
                        ))?;
                let id_token = authentication_result
                    .id_token
                    .as_ref()
                    .ok_or(anyhow::anyhow!(
                        "ID token not found in authentication result"
                    ))?;
                let refresh_token =
                    authentication_result
                        .refresh_token
                        .as_ref()
                        .ok_or(anyhow::anyhow!(
                            "Refresh token not found in authentication result"
                        ))?;
                return Ok((
                    access_token.clone(),
                    id_token.clone(),
                    refresh_token.clone(),
                ));
            } else {
                return Err(anyhow::anyhow!(
                    "Authentication failed. Please check your TOTP code."
                ));
            }
        }
        unimplemented!("Handle challenge: {}", challenge_name);
    } else {
        Err(anyhow::anyhow!("Authentication result is missing"))
    }
}

async fn bypass_login(refresh_token: String) -> Result<(String, String, String)> {
    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(Region::new(env::var("AWS_REGION")?))
        .load()
        .await;
    let client = Client::new(&config);
    let client_id = env::var("COGNITO_CLIENT_ID")?;

    let auth_response = client
        .initiate_auth()
        .auth_flow(AuthFlowType::RefreshTokenAuth)
        .client_id(client_id)
        .set_auth_parameters(Some(
            [("REFRESH_TOKEN".to_string(), refresh_token.clone())]
                .iter()
                .cloned()
                .collect(),
        ))
        .send()
        .await?;

    if let Some(authentication_result) = &auth_response.authentication_result {
        let access_token = authentication_result
            .access_token
            .as_ref()
            .ok_or(anyhow::anyhow!(
                "Access token not found in authentication result"
            ))?;
        let id_token = authentication_result
            .id_token
            .as_ref()
            .ok_or(anyhow::anyhow!(
                "ID token not found in authentication result"
            ))?;

        return Ok((access_token.clone(), id_token.clone(), refresh_token));
    }
    Err(anyhow::anyhow!("Authentication result is missing"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_perform_login() {
        let username =
            env::var("TEST_USERNAME").expect("TEST_USERNAME environment variable not set");
        let password =
            env::var("TEST_PASSWORD").expect("TEST_PASSWORD environment variable not set");
        let result = perform_login(username, password).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_bypass_login() {
        let username =
            env::var("TEST_USERNAME").expect("TEST_USERNAME environment variable not set");
        let password =
            env::var("TEST_PASSWORD").expect("TEST_PASSWORD environment variable not set");
        let result = perform_login(username, password).await;
        assert!(result.is_ok());

        let (_access_token, _id_token, refresh_token) = result.unwrap();
        let result = bypass_login(refresh_token).await;
        assert!(result.is_ok());
    }
}
