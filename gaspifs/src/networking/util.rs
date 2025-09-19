use anyhow::{Result, anyhow};
#[cfg(feature = "uploads")]
use std::path::Path;

#[derive(Debug, serde::Deserialize)]
pub struct ErrorResponse {
    pub error: i32,
    pub message: String,
}

/// Parses a URL and extracts the last segment as the file name.
/// The URL is expected to be in the format `https://example.com/path/to/resource.txt?query=param`.
/// The function will return the full URL without the query parameters and the last segment of the path as the file name.
/// If the URL is invalid or does not contain a valid last segment, an error is returned.
/// # Arguments
/// * `url` - A string slice representing the URL to be parsed.
/// # Returns
/// A `Result` containing a tuple of the full URL and the last segment as the file name.
/// If the URL is invalid, an error is returned.
/// # Example
/// ```
/// let url = "https://example.com/path/to/resource.txt?query=param";
/// let (parsed_url, file_name) = parse_url(url).unwrap();
/// assert_eq!(parsed_url, "https://example.com/path/to/resource.txt");
/// assert_eq!(file_name, "resource.txt");
/// ```
pub fn parse_url(url: &str) -> Result<(String, String)> {
    let url = url.split('?').next().unwrap_or(url);
    let segments: Vec<&str> = url.trim_end_matches('/').split('/').collect();
    if let Some(last) = segments.last() {
        let last_unquoted = percent_encoding::percent_decode_str(last).decode_utf8_lossy();
        Ok((url.to_string(), last_unquoted.to_string()))
    } else {
        Err(anyhow!("Invalid URL"))
    }
}

/// Extracts the file name from a given file path.
/// The function will return the last component of the path as the file name.
/// If the path does not contain a valid file name, an error is returned.
/// # Arguments
/// * `file_path` - A path reference to the file.
/// # Returns
/// A `Result` containing the file name as a `String`.
/// If the path is invalid or does not contain a file name, an error is returned.
/// # Example
/// ```
/// let file_path = "/path/to/file.txt";
/// let file_name = get_file_name_from_path(file_path).unwrap();
/// assert_eq!(file_name, "file.txt");
/// ```
#[cfg(feature = "uploads")]
pub fn get_file_name_from_path<P: AsRef<Path>>(file_path: P) -> Result<String> {
    file_path
        .as_ref()
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .ok_or(anyhow!("Invalid file path"))
}

/// Retrieves the sizes of files given their paths.
/// The function will return a vector of file sizes in bytes.
/// If any of the file paths are invalid or the files do not exist, an error is returned.
/// # Arguments
/// * `file_paths` - A slice of path references to the files.
/// # Returns
/// A `Result` containing a vector of file sizes in bytes.
/// If any of the file paths are invalid or the files do not exist, an error is returned.
/// # Example
/// ```
/// let file_paths = vec!["/path/to/file1.txt", "/path/to/file2.txt"];
/// let file_sizes = get_file_sizes(&file_paths).unwrap();
/// assert_eq!(file_sizes, vec![1234, 5678]); // Example sizes
/// ```
#[cfg(feature = "uploads")]
pub fn get_file_sizes<P: AsRef<Path>>(file_paths: &[P]) -> Result<Vec<u64>> {
    file_paths
        .iter()
        .map(|file| {
            std::fs::metadata(file)
                .map_err(anyhow::Error::from)
                .map(|meta| meta.len())
        })
        .collect::<Result<Vec<u64>>>()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_parse_url() {
        let url = "https://example.com/path/to/resource%20name.txt?key=123";
        let (parsed_url, file_name) = parse_url(url).unwrap();
        assert_eq!(
            parsed_url,
            "https://example.com/path/to/resource%20name.txt"
        );
        assert_eq!(file_name, "resource name.txt");
    }

    #[test]
    #[cfg(feature = "uploads")]
    fn test_get_file_name_from_path() {
        let file_path = "/path/to/file.txt";
        let file_name = get_file_name_from_path(file_path).unwrap();
        assert_eq!(file_name, "file.txt");
    }

    #[test]
    #[cfg(feature = "uploads")]
    fn test_get_file_sizes() {
        let mut file = NamedTempFile::new().unwrap();
        write!(file, "1234567890").unwrap();
        let path = file.path().to_str().unwrap();

        let file_paths = vec![path];
        // Note: This test assumes the files exist and have known sizes.
        // You may need to create these files with specific sizes for the test to pass.
        let file_sizes = get_file_sizes(&file_paths).unwrap();
        assert_eq!(file_sizes.len(), 1);
        assert_eq!(file_sizes, vec![10]);
    }
}
