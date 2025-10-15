use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Port mapping for Docker containers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortMapping {
    pub host: i32,
    pub container: i32,
}

/// Volume mount configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeMount {
    pub name: String,
    pub path: String,
}

/// Generic Docker run arguments (database-agnostic)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerRunArgs {
    pub image: String,
    #[serde(rename = "envVars")]
    pub env_vars: HashMap<String, String>,
    pub ports: Vec<PortMapping>,
    pub volumes: Vec<VolumeMount>,
    pub command: Vec<String>,
}

/// Container metadata (for storage and tracking)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerMetadata {
    pub id: String,
    #[serde(rename = "dbType")]
    pub db_type: String,
    pub version: String,
    pub port: i32,
    pub username: Option<String>,
    pub password: String,
    #[serde(rename = "databaseName")]
    pub database_name: Option<String>,
    #[serde(rename = "persistData")]
    pub persist_data: bool,
    #[serde(rename = "enableAuth")]
    pub enable_auth: bool,
    #[serde(rename = "maxConnections")]
    pub max_connections: Option<i32>,
}

/// Complete Docker run request from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerRunRequest {
    pub name: String,
    #[serde(rename = "dockerArgs")]
    pub docker_args: DockerRunArgs,
    pub metadata: ContainerMetadata,
}
