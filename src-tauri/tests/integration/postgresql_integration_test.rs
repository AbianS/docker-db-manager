use docker_db_manager_lib::services::DockerService;
use docker_db_manager_lib::types::{
    ContainerMetadata, DockerRunArgs, DockerRunRequest, PortMapping, VolumeMount,
};
use std::collections::HashMap;

mod utils;
use utils::*;

/// Integration tests specific to PostgreSQL
///
/// These tests verify that PostgreSQL functionality works correctly
/// with real Docker, including container creation, configuration, and cleanup.

#[tokio::test]
async fn test_create_basic_postgresql_container() {
    // Skip if Docker is not available
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping PostgreSQL test");
        return;
    }

    let container_name = "test-postgres-basic-integration";

    // Initial cleanup
    clean_container(container_name).await;

    // Arrange - Basic PostgreSQL configuration using DockerRunRequest
    let service = DockerService::new();

    let mut env_vars = HashMap::new();
    env_vars.insert("POSTGRES_PASSWORD".to_string(), "testpass123".to_string());
    env_vars.insert("POSTGRES_USER".to_string(), "testuser".to_string());
    env_vars.insert("POSTGRES_DB".to_string(), "testdb".to_string());

    let request = DockerRunRequest {
        name: container_name.to_string(),
        docker_args: DockerRunArgs {
            image: "postgres:13-alpine".to_string(),
            env_vars,
            ports: vec![PortMapping {
                host: 5435,
                container: 5432,
            }],
            volumes: vec![],
            command: vec![],
        },
        metadata: ContainerMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            db_type: "PostgreSQL".to_string(),
            version: "13-alpine".to_string(),
            port: 5435,
            username: Some("testuser".to_string()),
            password: "testpass123".to_string(),
            database_name: Some("testdb".to_string()),
            persist_data: false,
            enable_auth: true,
            max_connections: Some(50),
        },
    };

    // Act - Build and execute command
    let command = service.build_docker_command_from_args(&request.name, &request.docker_args);
    println!("🐳 PostgreSQL command generated: {:?}", command);

    // Verify PostgreSQL-specific elements
    assert!(
        command.contains(&"postgres:13-alpine".to_string()),
        "Should use correct PostgreSQL image"
    );
    assert!(
        command.contains(&"5435:5432".to_string()),
        "Should map PostgreSQL port correctly"
    );
    assert!(
        command.contains(&"POSTGRES_PASSWORD=testpass123".to_string()),
        "Should include PostgreSQL password"
    );
    assert!(
        command.contains(&"POSTGRES_USER=testuser".to_string()),
        "Should include PostgreSQL user"
    );
    assert!(
        command.contains(&"POSTGRES_DB=testdb".to_string()),
        "Should include PostgreSQL database name"
    );

    // Execute Docker command
    let container_id = run_docker_command(command).await;

    if let Err(e) = container_id {
        clean_container(container_name).await;
        panic!("Docker failed to create PostgreSQL container: {}", e);
    }

    println!(
        "✅ PostgreSQL container created with ID: {}",
        container_id.unwrap()
    );

    // Wait for PostgreSQL to be ready
    assert!(
        wait_for_container_ready(container_name, 10, 1).await,
        "PostgreSQL container failed to start within timeout"
    );

    assert!(
        container_exists(container_name).await,
        "PostgreSQL container should exist"
    );

    // Verify status
    if let Some(status) = get_container_status(container_name).await {
        println!("📊 PostgreSQL container status: {}", status);
        assert!(status.contains("Up"), "Container should be running");
    }

    // Cleanup
    clean_container(container_name).await;
    assert!(
        !container_exists(container_name).await,
        "PostgreSQL container should be deleted"
    );

    println!("✅ Basic PostgreSQL test completed successfully");
}

#[tokio::test]
async fn test_create_postgresql_container_with_volume() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping PostgreSQL test with volume");
        return;
    }

    let container_name = "test-postgres-volume-integration";
    let volume_name = format!("{}-data", container_name);

    // Initial cleanup
    clean_container(container_name).await;
    clean_volume(&volume_name).await;

    let service = DockerService::new();

    let mut env_vars = HashMap::new();
    env_vars.insert("POSTGRES_PASSWORD".to_string(), "volpass123".to_string());
    env_vars.insert("POSTGRES_USER".to_string(), "voluser".to_string());
    env_vars.insert("POSTGRES_DB".to_string(), "voldb".to_string());

    let request = DockerRunRequest {
        name: container_name.to_string(),
        docker_args: DockerRunArgs {
            image: "postgres:13-alpine".to_string(),
            env_vars,
            ports: vec![PortMapping {
                host: 5436,
                container: 5432,
            }],
            volumes: vec![VolumeMount {
                name: volume_name.clone(),
                path: "/var/lib/postgresql/data".to_string(),
            }],
            command: vec![],
        },
        metadata: ContainerMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            db_type: "PostgreSQL".to_string(),
            version: "13-alpine".to_string(),
            port: 5436,
            username: Some("voluser".to_string()),
            password: "volpass123".to_string(),
            database_name: Some("voldb".to_string()),
            persist_data: true,
            enable_auth: true,
            max_connections: Some(100),
        },
    };

    // Build command with volume
    let command = service.build_docker_command_from_args(&request.name, &request.docker_args);
    println!("🐳 PostgreSQL command with volume: {:?}", command);

    // Verify that it includes the volume
    assert!(
        command.contains(&"-v".to_string()),
        "Should include volume flag"
    );
    assert!(
        command.contains(&format!("{}:/var/lib/postgresql/data", volume_name)),
        "Should map PostgreSQL volume correctly"
    );

    // Create volume
    if let Err(e) = create_volume(&volume_name).await {
        println!("⚠️ Warning when creating volume: {}", e);
    }

    // Execute command
    let container_id = run_docker_command(command).await;

    if let Err(e) = container_id {
        clean_container(container_name).await;
        clean_volume(&volume_name).await;
        panic!(
            "Docker failed to create PostgreSQL container with volume: {}",
            e
        );
    }

    println!("✅ PostgreSQL container with volume created successfully");

    // Wait for PostgreSQL to be ready
    assert!(
        wait_for_container_ready(container_name, 10, 1).await,
        "PostgreSQL container with volume failed to start within timeout"
    );

    // Verify container and volume exist
    assert!(
        container_exists(container_name).await,
        "Container should exist"
    );
    assert!(volume_exists(&volume_name).await, "Volume should exist");

    // Cleanup
    clean_container(container_name).await;
    clean_volume(&volume_name).await;

    println!("✅ PostgreSQL test with volume completed");
}

#[tokio::test]
async fn test_update_postgresql_port() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping PostgreSQL port update test");
        return;
    }

    let container_name = "test-postgres-port-update";
    let old_port = 5440;
    let new_port = 5441;

    // Initial cleanup
    clean_container(container_name).await;

    let service = DockerService::new();

    // Create initial container
    let mut env_vars = HashMap::new();
    env_vars.insert("POSTGRES_PASSWORD".to_string(), "testpass".to_string());
    env_vars.insert("POSTGRES_USER".to_string(), "testuser".to_string());
    env_vars.insert("POSTGRES_DB".to_string(), "testdb".to_string());

    let initial_request = DockerRunRequest {
        name: container_name.to_string(),
        docker_args: DockerRunArgs {
            image: "postgres:13-alpine".to_string(),
            env_vars: env_vars.clone(),
            ports: vec![PortMapping {
                host: old_port,
                container: 5432,
            }],
            volumes: vec![],
            command: vec![],
        },
        metadata: ContainerMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            db_type: "PostgreSQL".to_string(),
            version: "13-alpine".to_string(),
            port: old_port,
            username: Some("testuser".to_string()),
            password: "testpass".to_string(),
            database_name: Some("testdb".to_string()),
            persist_data: false,
            enable_auth: true,
            max_connections: Some(100),
        },
    };

    let command =
        service.build_docker_command_from_args(&initial_request.name, &initial_request.docker_args);
    let result = run_docker_command(command).await;

    if let Err(e) = result {
        clean_container(container_name).await;
        panic!("Failed to create initial container: {}", e);
    }

    // Wait for initial container to be ready
    assert!(
        wait_for_container_ready(container_name, 10, 1).await,
        "Initial PostgreSQL container failed to start"
    );

    // Verify initial port
    if let Some(ports) = get_container_port(container_name).await {
        println!("📊 Initial ports: {}", ports);
        assert!(
            ports.contains(&old_port.to_string()),
            "Should have old port mapping"
        );
    }

    // Update: Remove old container and create with new port
    clean_container(container_name).await;

    // Wait longer to ensure port is released
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    let updated_request = DockerRunRequest {
        name: container_name.to_string(),
        docker_args: DockerRunArgs {
            image: "postgres:13-alpine".to_string(),
            env_vars,
            ports: vec![PortMapping {
                host: new_port,
                container: 5432,
            }],
            volumes: vec![],
            command: vec![],
        },
        metadata: ContainerMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            db_type: "PostgreSQL".to_string(),
            version: "13-alpine".to_string(),
            port: new_port,
            username: Some("testuser".to_string()),
            password: "testpass".to_string(),
            database_name: Some("testdb".to_string()),
            persist_data: false,
            enable_auth: true,
            max_connections: Some(100),
        },
    };

    let new_command =
        service.build_docker_command_from_args(&updated_request.name, &updated_request.docker_args);
    let new_result = run_docker_command(new_command).await;

    if let Err(e) = new_result {
        clean_container(container_name).await;
        panic!("Failed to create updated container: {}", e);
    }

    // Wait for updated container to be ready
    assert!(
        wait_for_container_ready(container_name, 10, 1).await,
        "Updated PostgreSQL container failed to start"
    );

    // Verify new port
    if let Some(ports) = get_container_port(container_name).await {
        println!("📊 Updated ports: {}", ports);
        assert!(
            ports.contains(&new_port.to_string()),
            "Should have new port mapping"
        );
    }

    // Cleanup
    clean_container(container_name).await;

    println!("✅ PostgreSQL port update test completed successfully");
}
