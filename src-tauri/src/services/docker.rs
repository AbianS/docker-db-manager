use crate::types::*;
use serde_json::json;
use std::sync::OnceLock;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

// Cache for the enriched PATH to avoid repeated shell invocations
static ENRICHED_PATH: OnceLock<String> = OnceLock::new();

pub struct DockerService;

impl DockerService {
    pub fn new() -> Self {
        Self
    }

    /// Get the enriched PATH by reading it from the user's shell
    /// This solves the issue where macOS apps don't inherit the full PATH
    async fn get_enriched_path(&self, app: &AppHandle) -> String {
        // Return cached PATH if available
        if let Some(path) = ENRICHED_PATH.get() {
            return path.clone();
        }

        let shell = app.shell();

        // Get PATH from the user's shell (bash/zsh loads .bash_profile/.zshrc)
        // This will include /usr/local/bin where Docker symlink lives
        #[cfg(target_os = "macos")]
        let path_output = shell
            .command("sh")
            .args(&["-l", "-c", "echo $PATH"])
            .output()
            .await;

        #[cfg(target_os = "linux")]
        let path_output = shell
            .command("sh")
            .args(&["-l", "-c", "echo $PATH"])
            .output()
            .await;

        #[cfg(target_os = "windows")]
        let path_output = shell
            .command("cmd")
            .args(&["/C", "echo %PATH%"])
            .output()
            .await;

        if let Ok(output) = path_output {
            if output.status.success() {
                let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path_str.is_empty() {
                    // Cache the enriched PATH
                    let _ = ENRICHED_PATH.set(path_str.clone());
                    return path_str;
                }
            }
        }

        // Fallback to current PATH if shell invocation fails
        std::env::var("PATH").unwrap_or_else(|_| String::new())
    }

    /// Build Docker command from generic DockerRunArgs
    /// This method is database-agnostic and doesn't need to know about specific database types
    pub fn build_docker_command_from_args(
        &self,
        container_name: &str,
        docker_args: &DockerRunArgs,
    ) -> Vec<String> {
        let mut args = vec![
            "run".to_string(),
            "-d".to_string(),
            "--name".to_string(),
            container_name.to_string(),
        ];

        // Add port mappings
        for port in &docker_args.ports {
            args.push("-p".to_string());
            args.push(format!("{}:{}", port.host, port.container));
        }

        // Add volume mounts
        for volume in &docker_args.volumes {
            args.push("-v".to_string());
            args.push(format!("{}:{}", volume.name, volume.path));
        }

        // Add environment variables
        for (key, value) in &docker_args.env_vars {
            args.push("-e".to_string());
            args.push(format!("{}={}", key, value));
        }

        // Add image
        args.push(docker_args.image.clone());

        // Add additional command arguments (e.g., for Redis)
        if !docker_args.command.is_empty() {
            args.extend(docker_args.command.clone());
        }

        args
    }

    pub async fn check_docker_status(&self, app: &AppHandle) -> Result<serde_json::Value, String> {
        let shell = app.shell();
        let enriched_path = self.get_enriched_path(app).await;

        // Try to get Docker version
        let version_output = shell
            .command("docker")
            .args(&["version", "--format", "json"])
            .env("PATH", &enriched_path)
            .output()
            .await;

        if let Ok(output) = version_output {
            if output.status.success() {
                let version_str = String::from_utf8_lossy(&output.stdout);
                if let Ok(version_json) = serde_json::from_str::<serde_json::Value>(&version_str) {
                    // Try to get additional info
                    let info_output = shell
                        .command("docker")
                        .args(&["info", "--format", "json"])
                        .env("PATH", &enriched_path)
                        .output()
                        .await;

                    if let Ok(info_out) = info_output {
                        if info_out.status.success() {
                            let info_str = String::from_utf8_lossy(&info_out.stdout);
                            if let Ok(info_json) =
                                serde_json::from_str::<serde_json::Value>(&info_str)
                            {
                                return Ok(json!({
                                    "status": "running",
                                    "version": version_json.get("Client").and_then(|c| c.get("Version")),
                                    "containers": {
                                        "total": info_json.get("Containers"),
                                        "running": info_json.get("ContainersRunning"),
                                        "stopped": info_json.get("ContainersStopped")
                                    },
                                    "images": info_json.get("Images"),
                                    "host": info_json.get("ServerVersion")
                                }));
                            }
                        }
                    }

                    // If info fails but version works, Docker is running but limited info
                    return Ok(json!({
                        "status": "running",
                        "version": version_json.get("Client").and_then(|c| c.get("Version")),
                        "containers": {
                            "total": 0,
                            "running": 0,
                            "stopped": 0
                        },
                        "images": 0,
                        "host": "docker"
                    }));
                }
            }
        }

        // Docker is not running or not installed
        Ok(json!({
            "status": "stopped",
            "error": "Docker daemon is not running or Docker is not installed"
        }))
    }

    pub async fn sync_containers_with_docker(
        &self,
        app: &AppHandle,
        container_map: &mut std::collections::HashMap<String, DatabaseContainer>,
    ) -> Result<(), String> {
        let shell = app.shell();
        let enriched_path = self.get_enriched_path(app).await;

        // Get all containers from Docker
        let output = shell
            .command("docker")
            .args(&["ps", "-a", "--format", "{{.ID}},{{.Names}},{{.Status}}"])
            .env("PATH", &enriched_path)
            .output()
            .await
            .map_err(|e| format!("Failed to get Docker containers: {}", e))?;

        if !output.status.success() {
            return Err("Failed to get Docker containers".to_string());
        }

        let docker_containers_str = String::from_utf8_lossy(&output.stdout);
        let mut docker_containers = std::collections::HashMap::new();

        // Parse Docker containers output
        for line in docker_containers_str.lines() {
            if line.trim().is_empty() {
                continue;
            }

            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() >= 3 {
                let container_id = parts[0].trim();
                let name = parts[1].trim();
                let status = parts[2].trim();

                // Determine if container is running
                let is_running = status.starts_with("Up");
                docker_containers.insert(name.to_string(), (container_id.to_string(), is_running));
            }
        }

        // Update our database records
        for (_, database) in container_map.iter_mut() {
            if let Some((docker_id, is_running)) = docker_containers.get(&database.name) {
                // Update container ID if it changed
                database.container_id = Some(docker_id.clone());
                // Update status based on Docker reality
                database.status = if *is_running {
                    "running".to_string()
                } else {
                    "stopped".to_string()
                };
            } else {
                // Container doesn't exist in Docker anymore
                database.status = "stopped".to_string();
                database.container_id = None;
            }
        }

        Ok(())
    }

    pub async fn start_container(&self, app: &AppHandle, container_id: &str) -> Result<(), String> {
        let shell = app.shell();
        let enriched_path = self.get_enriched_path(app).await;

        let output = shell
            .command("docker")
            .args(&["start", container_id])
            .env("PATH", &enriched_path)
            .output()
            .await
            .map_err(|e| format!("Failed to start container: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to start container: {}", error));
        }

        Ok(())
    }

    pub async fn stop_container(&self, app: &AppHandle, container_id: &str) -> Result<(), String> {
        let shell = app.shell();
        let enriched_path = self.get_enriched_path(app).await;

        let output = shell
            .command("docker")
            .args(&["stop", container_id])
            .env("PATH", &enriched_path)
            .output()
            .await
            .map_err(|e| format!("Failed to stop container: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to stop container: {}", error));
        }

        Ok(())
    }

    pub async fn remove_container(
        &self,
        app: &AppHandle,
        container_id: &str,
    ) -> Result<(), String> {
        let shell = app.shell();
        let enriched_path = self.get_enriched_path(app).await;

        // Try to stop container (ignore errors)
        let _ = shell
            .command("docker")
            .args(&["stop", container_id])
            .env("PATH", &enriched_path)
            .output()
            .await;

        // Try to remove container
        let output = shell
            .command("docker")
            .args(&["rm", container_id])
            .env("PATH", &enriched_path)
            .output()
            .await;

        // Check if the error is "No such container" which we can ignore
        if let Ok(output) = output {
            if !output.status.success() {
                let error = String::from_utf8_lossy(&output.stderr);
                // Only return error if it's not "No such container"
                if !error.contains("No such container") {
                    return Err(format!("Failed to remove container: {}", error));
                }
            }
        }

        Ok(())
    }

    pub async fn create_volume_if_needed(
        &self,
        app: &AppHandle,
        volume_name: &str,
    ) -> Result<(), String> {
        let shell = app.shell();
        let enriched_path = self.get_enriched_path(app).await;

        // Check if volume exists
        let volume_check = shell
            .command("docker")
            .args(&["volume", "inspect", volume_name])
            .env("PATH", &enriched_path)
            .output()
            .await;

        if volume_check.is_err() || !volume_check.unwrap().status.success() {
            // Create volume
            let output = shell
                .command("docker")
                .args(&["volume", "create", volume_name])
                .env("PATH", &enriched_path)
                .output()
                .await
                .map_err(|e| format!("Failed to create volume: {}", e))?;

            if !output.status.success() {
                let error = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Failed to create volume: {}", error));
            }
        }

        Ok(())
    }

    pub async fn run_container(
        &self,
        app: &AppHandle,
        docker_args: &[String],
    ) -> Result<String, String> {
        let shell = app.shell();
        let enriched_path = self.get_enriched_path(app).await;

        let output = shell
            .command("docker")
            .args(docker_args)
            .env("PATH", &enriched_path)
            .output()
            .await
            .map_err(|e| format!("Failed to execute docker command: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(error.to_string());
        }

        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    pub async fn remove_volume_if_exists(
        &self,
        app: &AppHandle,
        volume_name: &str,
    ) -> Result<(), String> {
        let shell = app.shell();
        let enriched_path = self.get_enriched_path(app).await;

        // Check if volume exists first
        let volume_check = shell
            .command("docker")
            .args(&["volume", "inspect", volume_name])
            .env("PATH", &enriched_path)
            .output()
            .await;

        if volume_check.is_ok() && volume_check.unwrap().status.success() {
            // Volume exists, try to remove it
            let output = shell
                .command("docker")
                .args(&["volume", "rm", volume_name])
                .env("PATH", &enriched_path)
                .output()
                .await;

            if let Ok(output) = output {
                if !output.status.success() {
                    let error = String::from_utf8_lossy(&output.stderr);
                    // Only return error if it's not "No such volume"
                    if !error.contains("No such volume") {
                        return Err(format!("Failed to remove volume: {}", error));
                    }
                }
            }
        }

        Ok(())
    }

    pub async fn migrate_volume_data(
        &self,
        app: &AppHandle,
        old_volume: &str,
        new_volume: &str,
        _data_path: &str,
    ) -> Result<(), String> {
        let shell = app.shell();
        let enriched_path = self.get_enriched_path(app).await;

        // Check if old volume exists
        let old_volume_check = shell
            .command("docker")
            .args(&["volume", "inspect", old_volume])
            .env("PATH", &enriched_path)
            .output()
            .await;

        if old_volume_check.is_err() || !old_volume_check.unwrap().status.success() {
            // Old volume doesn't exist, nothing to migrate
            return Ok(());
        }

        // Create new volume if it doesn't exist
        self.create_volume_if_needed(app, new_volume).await?;

        // Use a temporary container to copy data from old volume to new volume
        let temp_container_name = format!("temp-migrate-{}", uuid::Uuid::new_v4());

        // Create temporary container with both volumes mounted
        let create_output = shell
            .command("docker")
            .args(&[
                "create",
                "--name",
                &temp_container_name,
                "-v",
                &format!("{}:/old_data", old_volume),
                "-v",
                &format!("{}:/new_data", new_volume),
                "alpine:latest",
                "sh",
                "-c",
                "cp -a /old_data/. /new_data/ 2>/dev/null || true",
            ])
            .env("PATH", &enriched_path)
            .output()
            .await
            .map_err(|e| format!("Failed to create migration container: {}", e))?;

        if !create_output.status.success() {
            let error = String::from_utf8_lossy(&create_output.stderr);
            return Err(format!("Failed to create migration container: {}", error));
        }

        // Start the container to perform the copy
        let start_output = shell
            .command("docker")
            .args(&["start", "-a", &temp_container_name])
            .env("PATH", &enriched_path)
            .output()
            .await;

        // Clean up temporary container (ignore errors)
        let _ = shell
            .command("docker")
            .args(&["rm", &temp_container_name])
            .env("PATH", &enriched_path)
            .output()
            .await;

        // Check if start was successful
        if let Ok(output) = start_output {
            if !output.status.success() {
                let error = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Failed to migrate volume data: {}", error));
            }
        } else {
            return Err("Failed to execute data migration".to_string());
        }

        Ok(())
    }

    pub async fn force_remove_container_by_name(
        &self,
        app: &AppHandle,
        container_name: &str,
    ) -> Result<(), String> {
        let shell = app.shell();
        let enriched_path = self.get_enriched_path(app).await;

        // Try to stop container (ignore errors)
        let _ = shell
            .command("docker")
            .args(&["stop", container_name])
            .env("PATH", &enriched_path)
            .output()
            .await;

        // Try to remove container by name
        let output = shell
            .command("docker")
            .args(&["rm", container_name])
            .env("PATH", &enriched_path)
            .output()
            .await;

        // Check if the error is "No such container" which we can ignore
        if let Ok(output) = output {
            if !output.status.success() {
                let error = String::from_utf8_lossy(&output.stderr);
                // Only return error if it's not "No such container"
                if !error.contains("No such container") {
                    return Err(format!("Failed to remove container: {}", error));
                }
            }
        }

        Ok(())
    }

    pub async fn get_container_logs(
        &self,
        app: &AppHandle,
        container_id: &str,
        tail_lines: Option<i32>,
    ) -> Result<String, String> {
        let shell = app.shell();
        let enriched_path = self.get_enriched_path(app).await;

        // Default to 500 lines if not specified
        let tail = tail_lines.unwrap_or(500).to_string();

        // Execute: docker logs --tail N --timestamps CONTAINER_ID
        let output = shell
            .command("docker")
            .args(&["logs", "--tail", &tail, "--timestamps", container_id])
            .env("PATH", &enriched_path)
            .output()
            .await
            .map_err(|e| format!("Failed to get container logs: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to get container logs: {}", error));
        }

        // Return logs as UTF-8 string
        let logs = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(logs)
    }
}
