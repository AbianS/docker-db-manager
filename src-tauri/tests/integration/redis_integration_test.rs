use docker_db_manager_lib::services::DockerService;
use docker_db_manager_lib::types::{
    ContainerMetadata, DockerRunArgs, DockerRunRequest, PortMapping, VolumeMount,
};
use std::collections::HashMap;

mod utils;
use utils::*;

/// Integration tests specific to Redis
///
/// These tests verify that Redis functionality works correctly
/// with real Docker, including container creation, configuration, and cleanup.

#[tokio::test]
async fn test_create_basic_redis_container() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping Redis test");
        return;
    }

    let container_name = "test-redis-basic-integration";

    // Initial cleanup
    clean_container(container_name).await;

    let service = DockerService::new();

    let env_vars = HashMap::new(); // Redis doesn't need env vars for basic setup

    let request = DockerRunRequest {
        name: container_name.to_string(),
        docker_args: DockerRunArgs {
            image: "redis:7-alpine".to_string(),
            env_vars,
            ports: vec![PortMapping {
                host: 6380,
                container: 6379,
            }],
            volumes: vec![],
            command: vec![],
        },
        metadata: ContainerMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            db_type: "Redis".to_string(),
            version: "7-alpine".to_string(),
            port: 6380,
            username: None,
            password: String::new(),
            database_name: None,
            persist_data: false,
            enable_auth: false,
            max_connections: Some(10000),
        },
    };

    let command = service.build_docker_command_from_args(&request.name, &request.docker_args);
    println!("🐳 Redis command generated: {:?}", command);

    // Verify Redis-specific elements
    assert!(
        command.contains(&"redis:7-alpine".to_string()),
        "Should use correct Redis image"
    );
    assert!(
        command.contains(&"6380:6379".to_string()),
        "Should map Redis port correctly"
    );

    let container_id = run_docker_command(command).await;

    if let Err(e) = container_id {
        clean_container(container_name).await;
        panic!("Docker failed to create Redis container: {}", e);
    }

    println!(
        "✅ Redis container created with ID: {}",
        container_id.unwrap()
    );

    // Wait for Redis to be ready
    assert!(
        wait_for_container_ready(container_name, 10, 1).await,
        "Redis container failed to start within timeout"
    );

    assert!(
        container_exists(container_name).await,
        "Redis container should exist"
    );

    if let Some(status) = get_container_status(container_name).await {
        println!("📊 Redis container status: {}", status);
        assert!(status.contains("Up"), "Container should be running");
    }

    // Cleanup
    clean_container(container_name).await;

    println!("✅ Basic Redis test completed successfully");
}

#[tokio::test]
async fn test_create_redis_container_with_auth() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping Redis auth test");
        return;
    }

    let container_name = "test-redis-auth-integration";

    // Initial cleanup
    clean_container(container_name).await;

    let service = DockerService::new();

    let env_vars = HashMap::new();

    let request = DockerRunRequest {
        name: container_name.to_string(),
        docker_args: DockerRunArgs {
            image: "redis:7-alpine".to_string(),
            env_vars,
            ports: vec![PortMapping {
                host: 6381,
                container: 6379,
            }],
            volumes: vec![],
            command: vec![
                "redis-server".to_string(),
                "--requirepass".to_string(),
                "myredispass123".to_string(),
            ],
        },
        metadata: ContainerMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            db_type: "Redis".to_string(),
            version: "7-alpine".to_string(),
            port: 6381,
            username: None,
            password: "myredispass123".to_string(),
            database_name: None,
            persist_data: false,
            enable_auth: true,
            max_connections: Some(10000),
        },
    };

    let command = service.build_docker_command_from_args(&request.name, &request.docker_args);
    println!("🐳 Redis command with auth: {:?}", command);

    // Verify auth command
    assert!(
        command.contains(&"--requirepass".to_string()),
        "Should include requirepass flag"
    );
    assert!(
        command.contains(&"myredispass123".to_string()),
        "Should include password"
    );

    let container_id = run_docker_command(command).await;

    if let Err(e) = container_id {
        clean_container(container_name).await;
        panic!("Docker failed to create Redis container with auth: {}", e);
    }

    println!("✅ Redis container with auth created");

    // Wait for Redis to be ready
    assert!(
        wait_for_container_ready(container_name, 10, 1).await,
        "Redis container with auth failed to start within timeout"
    );

    assert!(
        container_exists(container_name).await,
        "Container should exist"
    );

    // Cleanup
    clean_container(container_name).await;

    println!("✅ Redis auth test completed");
}

#[tokio::test]
async fn test_create_redis_container_with_persistence() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping Redis persistence test");
        return;
    }

    let container_name = "test-redis-persist-integration";
    let volume_name = format!("{}-data", container_name);

    // Initial cleanup
    clean_container(container_name).await;
    clean_volume(&volume_name).await;

    let service = DockerService::new();

    let env_vars = HashMap::new();

    let request = DockerRunRequest {
        name: container_name.to_string(),
        docker_args: DockerRunArgs {
            image: "redis:7-alpine".to_string(),
            env_vars,
            ports: vec![PortMapping {
                host: 6382,
                container: 6379,
            }],
            volumes: vec![VolumeMount {
                name: volume_name.clone(),
                path: "/data".to_string(),
            }],
            command: vec![
                "redis-server".to_string(),
                "--appendonly".to_string(),
                "yes".to_string(),
            ],
        },
        metadata: ContainerMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            db_type: "Redis".to_string(),
            version: "7-alpine".to_string(),
            port: 6382,
            username: None,
            password: String::new(),
            database_name: None,
            persist_data: true,
            enable_auth: false,
            max_connections: Some(10000),
        },
    };

    let command = service.build_docker_command_from_args(&request.name, &request.docker_args);
    println!("🐳 Redis command with persistence: {:?}", command);

    assert!(
        command.contains(&"-v".to_string()),
        "Should include volume flag"
    );
    assert!(
        command.contains(&format!("{}:/data", volume_name)),
        "Should map Redis data volume"
    );
    assert!(
        command.contains(&"--appendonly".to_string()),
        "Should enable AOF persistence"
    );

    if let Err(e) = create_volume(&volume_name).await {
        println!("⚠️ Warning when creating volume: {}", e);
    }

    let container_id = run_docker_command(command).await;

    if let Err(e) = container_id {
        clean_container(container_name).await;
        clean_volume(&volume_name).await;
        panic!(
            "Docker failed to create Redis container with persistence: {}",
            e
        );
    }

    println!("✅ Redis container with persistence created");

    // Wait for Redis to be ready
    assert!(
        wait_for_container_ready(container_name, 10, 1).await,
        "Redis container with persistence failed to start within timeout"
    );

    assert!(
        container_exists(container_name).await,
        "Container should exist"
    );
    assert!(volume_exists(&volume_name).await, "Volume should exist");

    // Cleanup
    clean_container(container_name).await;
    clean_volume(&volume_name).await;

    println!("✅ Redis persistence test completed");
}
