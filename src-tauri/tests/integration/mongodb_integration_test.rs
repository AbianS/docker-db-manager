use docker_db_manager_lib::services::DockerService;
use docker_db_manager_lib::types::{
    ContainerMetadata, DockerRunArgs, DockerRunRequest, PortMapping, VolumeMount,
};
use std::collections::HashMap;

mod utils;
use utils::*;

/// Integration tests specific to MongoDB
///
/// These tests verify that MongoDB functionality works correctly
/// with real Docker, including container creation, configuration, and cleanup.

#[tokio::test]
async fn test_create_basic_mongodb_container() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping MongoDB test");
        return;
    }

    let container_name = "test-mongo-basic-integration";

    // Initial cleanup
    clean_container(container_name).await;

    let service = DockerService::new();

    let mut env_vars = HashMap::new();
    env_vars.insert(
        "MONGO_INITDB_ROOT_USERNAME".to_string(),
        "admin".to_string(),
    );
    env_vars.insert(
        "MONGO_INITDB_ROOT_PASSWORD".to_string(),
        "mongopass123".to_string(),
    );
    env_vars.insert("MONGO_INITDB_DATABASE".to_string(), "testdb".to_string());

    let request = DockerRunRequest {
        name: container_name.to_string(),
        docker_args: DockerRunArgs {
            image: "mongo:7".to_string(),
            env_vars,
            ports: vec![PortMapping {
                host: 27018,
                container: 27017,
            }],
            volumes: vec![],
            command: vec![],
        },
        metadata: ContainerMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            db_type: "MongoDB".to_string(),
            version: "7".to_string(),
            port: 27018,
            username: Some("admin".to_string()),
            password: "mongopass123".to_string(),
            database_name: Some("testdb".to_string()),
            persist_data: false,
            enable_auth: true,
            max_connections: Some(1000),
        },
    };

    let command = service.build_docker_command_from_args(&request.name, &request.docker_args);
    println!("🐳 MongoDB command generated: {:?}", command);

    // Verify MongoDB-specific elements
    assert!(
        command.contains(&"mongo:7".to_string()),
        "Should use correct MongoDB image"
    );
    assert!(
        command.contains(&"27018:27017".to_string()),
        "Should map MongoDB port correctly"
    );
    assert!(
        command.contains(&"MONGO_INITDB_ROOT_USERNAME=admin".to_string()),
        "Should include MongoDB username"
    );
    assert!(
        command.contains(&"MONGO_INITDB_ROOT_PASSWORD=mongopass123".to_string()),
        "Should include MongoDB password"
    );

    let container_id = run_docker_command(command).await;

    if let Err(e) = container_id {
        clean_container(container_name).await;
        panic!("Docker failed to create MongoDB container: {}", e);
    }

    println!(
        "✅ MongoDB container created with ID: {}",
        container_id.unwrap()
    );

    // Wait for MongoDB to be ready
    assert!(
        wait_for_container_ready(container_name, 15, 1).await,
        "MongoDB container failed to start within timeout"
    );

    assert!(
        container_exists(container_name).await,
        "MongoDB container should exist"
    );

    if let Some(status) = get_container_status(container_name).await {
        println!("📊 MongoDB container status: {}", status);
    }

    // Cleanup
    clean_container(container_name).await;

    println!("✅ Basic MongoDB test completed successfully");
}

#[tokio::test]
async fn test_create_mongodb_container_with_volume() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping MongoDB volume test");
        return;
    }

    let container_name = "test-mongo-volume-integration";
    let volume_name = format!("{}-data", container_name);

    // Initial cleanup
    clean_container(container_name).await;
    clean_volume(&volume_name).await;

    let service = DockerService::new();

    let mut env_vars = HashMap::new();
    env_vars.insert(
        "MONGO_INITDB_ROOT_USERNAME".to_string(),
        "admin".to_string(),
    );
    env_vars.insert(
        "MONGO_INITDB_ROOT_PASSWORD".to_string(),
        "mongopass".to_string(),
    );

    let request = DockerRunRequest {
        name: container_name.to_string(),
        docker_args: DockerRunArgs {
            image: "mongo:7".to_string(),
            env_vars,
            ports: vec![PortMapping {
                host: 27019,
                container: 27017,
            }],
            volumes: vec![VolumeMount {
                name: volume_name.clone(),
                path: "/data/db".to_string(),
            }],
            command: vec![],
        },
        metadata: ContainerMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            db_type: "MongoDB".to_string(),
            version: "7".to_string(),
            port: 27019,
            username: Some("admin".to_string()),
            password: "mongopass".to_string(),
            database_name: None,
            persist_data: true,
            enable_auth: true,
            max_connections: Some(1000),
        },
    };

    let command = service.build_docker_command_from_args(&request.name, &request.docker_args);
    println!("🐳 MongoDB command with volume: {:?}", command);

    assert!(
        command.contains(&"-v".to_string()),
        "Should include volume flag"
    );
    assert!(
        command.contains(&format!("{}:/data/db", volume_name)),
        "Should map MongoDB volume correctly"
    );

    if let Err(e) = create_volume(&volume_name).await {
        println!("⚠️ Warning when creating volume: {}", e);
    }

    let container_id = run_docker_command(command).await;

    if let Err(e) = container_id {
        clean_container(container_name).await;
        clean_volume(&volume_name).await;
        panic!(
            "Docker failed to create MongoDB container with volume: {}",
            e
        );
    }

    println!("✅ MongoDB container with volume created successfully");

    // Wait for MongoDB to be ready
    assert!(
        wait_for_container_ready(container_name, 15, 1).await,
        "MongoDB container with volume failed to start within timeout"
    );

    assert!(
        container_exists(container_name).await,
        "Container should exist"
    );
    assert!(volume_exists(&volume_name).await, "Volume should exist");

    // Cleanup
    clean_container(container_name).await;
    clean_volume(&volume_name).await;

    println!("✅ MongoDB volume test completed");
}

#[tokio::test]
async fn test_create_mongodb_container_without_auth() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping MongoDB no-auth test");
        return;
    }

    let container_name = "test-mongo-noauth-integration";

    // Initial cleanup
    clean_container(container_name).await;

    let service = DockerService::new();

    let env_vars = HashMap::new(); // No auth env vars

    let request = DockerRunRequest {
        name: container_name.to_string(),
        docker_args: DockerRunArgs {
            image: "mongo:7".to_string(),
            env_vars,
            ports: vec![PortMapping {
                host: 27020,
                container: 27017,
            }],
            volumes: vec![],
            command: vec![],
        },
        metadata: ContainerMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            db_type: "MongoDB".to_string(),
            version: "7".to_string(),
            port: 27020,
            username: None,
            password: String::new(),
            database_name: None,
            persist_data: false,
            enable_auth: false,
            max_connections: Some(1000),
        },
    };

    let command = service.build_docker_command_from_args(&request.name, &request.docker_args);
    println!("🐳 MongoDB command without auth: {:?}", command);

    // Verify no auth env vars
    assert!(
        !command.contains(&"MONGO_INITDB_ROOT_USERNAME".to_string()),
        "Should not include username when auth is disabled"
    );
    assert!(
        !command.contains(&"MONGO_INITDB_ROOT_PASSWORD".to_string()),
        "Should not include password when auth is disabled"
    );

    let container_id = run_docker_command(command).await;

    if let Err(e) = container_id {
        clean_container(container_name).await;
        panic!(
            "Docker failed to create MongoDB container without auth: {}",
            e
        );
    }

    println!("✅ MongoDB container without auth created");

    // Wait for MongoDB to be ready
    assert!(
        wait_for_container_ready(container_name, 15, 1).await,
        "MongoDB container without auth failed to start within timeout"
    );

    assert!(
        container_exists(container_name).await,
        "Container should exist"
    );

    // Cleanup
    clean_container(container_name).await;

    println!("✅ MongoDB no-auth test completed");
}
