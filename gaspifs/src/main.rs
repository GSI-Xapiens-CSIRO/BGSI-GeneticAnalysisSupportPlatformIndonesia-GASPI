use crate::auth::login;
use crate::networking::{downloads, files, projects};
use anyhow::{Result, anyhow};
use clap::Parser;
use std::process::ExitCode;
use std::{env, path::Path};
mod args;
mod auth;
mod networking;

#[cfg(feature = "uploads")]
use crate::networking::uploads;

fn load_env() -> Result<()> {
    let raw_json = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/gaspifs.json"));

    let json: serde_json::Value = serde_json::from_str(raw_json)?;
    if let Some(obj) = json.as_object() {
        for (key, value) in obj {
            unsafe {
                if let Some(val_str) = value.as_str() {
                    env::set_var(key, val_str);
                } else {
                    env::set_var(key, value.to_string());
                }
            }
        }
    }

    Ok(())
}

async fn run() -> Result<()> {
    let args = args::Cli::parse();
    // we call this function but ignore its errors and seek environment variables
    // this is useful for testing with environment properly set using export VAR=value
    let _ = load_env();
    let api = env::var("CLI_API")?;

    match args.command {
        args::Command::Projects {} => {
            let Ok((_access_token, id_token, _refresh_token)) = login().await else {
                eprintln!("Login failed. Please check your credentials.");
                return Ok(());
            };
            // Logic to list project
            let projects = projects::list_projects(&api, &id_token).await?;
            for (i, project) in projects.iter().enumerate() {
                println!(
                    "Project {:>4}: \n\tName: \"{}\"\n\tDescription: \"{}\"",
                    i + 1,
                    project.name,
                    project.description
                );
            }
        }
        args::Command::Files { project } => {
            let Ok((_access_token, id_token, _refresh_token)) = login().await else {
                eprintln!("Login failed. Please check your credentials.");
                return Ok(());
            };
            let files = files::list_project_files(&api, project.as_deref(), &id_token).await?;
            for (i, file) in files.iter().enumerate() {
                println!("File {:>4}: \"{}\"", i + 1, file);
            }
        }
        args::Command::Download {
            project,
            files,
            destination,
        } => {
            let Ok((_access_token, id_token, _refresh_token)) = login().await else {
                eprintln!("Login failed. Please check your credentials.");
                return Ok(());
            };
            // Logic to download files from a project
            let destination = Path::new(&destination);
            if destination.exists() && !destination.is_dir() {
                return Err(anyhow!("Destination must be a directory."));
            }
            if !destination.exists() {
                std::fs::create_dir_all(destination)
                    .map_err(|_| anyhow!("Failed to create destination directory."))?;
            }
            let download_urls =
                downloads::get_download_urls(&api, project.as_deref(), &files, &id_token).await?;
            downloads::download_files(&download_urls, destination.to_str().unwrap()).await?;
        }
        #[cfg(feature = "uploads")]
        args::Command::Upload { project, files } => {
            let Ok((_access_token, id_token, _refresh_token)) = login().await else {
                eprintln!("Login failed. Please check your credentials.");
                return Ok(());
            };
            // Logic to upload files to a project
            if files.is_empty() {
                return Err(anyhow!("No files specified for upload."));
            }
            let upload_urls =
                uploads::get_upload_urls(&api, project.as_deref(), &files, &id_token).await?;
            uploads::upload_files(upload_urls, &files).await?;
        }
        args::Command::Login {} => {
            // Logic to login
            let Ok((_access_token, _id_token, _refresh_token)) = login().await else {
                eprintln!("Login failed. Please check your credentials.");
                return Ok(());
            };
            println!(
                "You are now authenticated. You can now use the CLI commands on terminal or Jupyter notebooks."
            );
        }
        args::Command::Logout {} => {
            // Logic to logout
            auth::logout().await?;
        }
    }

    Ok(())
}

#[tokio::main]
async fn main() -> ExitCode {
    if let Err(err) = run().await {
        eprintln!("{err}");
        return ExitCode::from(1);
    }
    ExitCode::SUCCESS
}
