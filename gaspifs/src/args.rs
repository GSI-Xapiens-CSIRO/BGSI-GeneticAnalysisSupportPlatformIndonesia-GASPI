use clap::{Parser, Subcommand};

#[derive(Parser)]
pub struct Cli {
    #[clap(subcommand)]
    pub command: Command,
}

#[derive(Subcommand)]
pub enum Command {
    /// List projects
    Projects {},
    /// List files in user space or a project
    Files {
        /// The project for which to list files
        #[clap(short, long, value_parser)]
        project: Option<String>,
    },
    /// Download files from user space or a project
    Download {
        /// The project from which to download files
        #[clap(short, long, value_parser)]
        project: Option<String>,
        /// The files to download
        #[clap(short, long, value_parser, num_args(1..), required = true)]
        files: Vec<String>,
        /// Download destination
        #[clap(short, long, value_parser)]
        destination: String,
    },
    #[cfg(feature = "uploads")]
    /// Upload files to user space or a project
    Upload {
        /// The project to which to upload files
        #[clap(short, long, value_parser)]
        project: Option<String>,
        /// The files to upload
        #[clap(short, long, value_parser, num_args(1..), required = true)]
        files: Vec<String>,
    },
    /// Login to the CLI
    Login {},
    /// Logout from the CLI
    Logout {},
}
