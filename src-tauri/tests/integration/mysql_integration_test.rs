use docker_db_manager_lib::services::DockerService;
use docker_db_manager_lib::types::{ContainerMetadata, DockerRunArgs, DockerRunRequest, PortMapping, VolumeMount};
use std::collections::HashMap;

mod utils;
use utils::*;

/// Integration tests specific to MySQL
///
/// These tests verify that MySQL functionality works correctly
/// with real Docker, including container creation, configuration, and cleanup.

#[tokio::test]
async fn test_create_basic_mysql_container() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping MySQL test");
        return;
    }

    let container_name = "test-mysql-basic-integration";

    // Initial cleanup
    clean_container(container_name).await;

    let service = DockerService::new();

    let mut env_vars = HashMap::new();
    env_vars.insert("MYSQL_ROOT_PASSWORD".to_string(), "rootpass123".to_string());
    env_vars.insert("MYSQL_DATABASE".to_string(), "testdb".to_string());
    env_vars.insert("MYSQL_USER".to_string(), "testuser".to_string());
    env_vars.insert("MYSQL_PASSWORD".to_string(), "testpass123".to_string());

    let request = DockerRunRequest {
        name: container_name.to_string(),
        docker_args: DockerRunArgs {
            image: "mysql:8.0".to_string(),
            env_vars,
            ports: vec![PortMapping {
                host: 3307,
                container: 3306,
            }],
            volumes: vec![],
            command: vec![],
        },
        metadata: ContainerMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            db_type: "MySQL".to_string(),
            version: "8.0".to_string(),
            port: 3307,
            username: Some("testuser".to_string()),
            password: "testpass123".to_string(),
            database_name: Some("testdb".to_string()),
            persist_data: false,
            enable_auth: true,
            max_connections: Some(150),
        },
    };

    let command = service.build_docker_command_from_args(&request.name, &request.docker_args);
    println!("🐳 MySQL command generated: {:?}", command);

    // Verify MySQL-specific elements
    assert!(
        command.contains(&"mysql:8.0".to_string()),
        "Should use correct MySQL image"
    );
    assert!(
        command.contains(&"3307:3306".to_string()),
        "Should map MySQL port correctly"
    );
    assert!(
        command.contains(&"MYSQL_ROOT_PASSWORD=rootpass123".to_string()),
        "Should include MySQL root password"
    );
    assert!(
        command.contains(&"MYSQL_DATABASE=testdb".to_string()),
        "Should include MySQL database name"
    );

    let container_id = run_docker_command(command).await;

    if let Err(e) = container_id {
        clean_container(container_name).await;
        panic!("Docker failed to create MySQL container: {}", e);
    }

    println!("✅ MySQL container created with ID: {}", container_id.unwrap());

    wait_for_container(5).await; // MySQL takes longer to start

    assert!(
        container_exists(container_name).await,
        "MySQL container should exist"
    );

    if let Some(status) = get_container_status(container_name).await {
        println!("📊 MySQL container status: {}", status);
    }

    // Cleanup
    clean_container(container_name).await;

    println!("✅ Basic MySQL test completed successfully");
}

#[tokio::test]
async fn test_create_mysql_container_with_volume() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping MySQL volume test");
        return;
    }

    let container_name = "test-mysql-volume-integration";
    let volume_name = format!("{}-data", container_name);

    // Initial cleanup
    clean_container(container_name).await;
    clean_volume(&volume_name).await;

    let service = DockerService::new();

    let mut env_vars = HashMap::new();
    env_vars.insert("MYSQL_ROOT_PASSWORD".to_string(), "rootpass".to_string());
    env_vars.insert("MYSQL_DATABASE".to_string(), "voldb".to_string());

    let request = DockerRunRequest {
        name: container_name.to_string(),
        docker_args: DockerRunArgs {
            image: "mysql:8.0".to_string(),
            env_vars,
            ports: vec![PortMapping {
                host: 3308,
                container: 3306,
            }],
            volumes: vec![VolumeMount {
                name: volume_name.clone(),
                path: "/var/lib/mysql".to_string(),
            }],
            command: vec![],
        },
        metadata: ContainerMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            db_type: "MySQL".to_string(),
            version: "8.0".to_string(),
            port: 3308,
            username: Some("root".to_string()),
            password: "rootpass".to_string(),
            database_name: Some("voldb".to_string()),
            persist_data: true,
            enable_auth: true,
            max_connections: Some(150),
        },
    };

    let command = service.build_docker_command_from_args(&request.name, &request.docker_args);
    println!("🐳 MySQL command with volume: {:?}", command);

    assert!(
        command.contains(&"-v".to_string()),
        "Should include volume flag"
    );
    assert!(
        command.contains(&format!("{}:/var/lib/mysql", volume_name)),
        "Should map MySQL volume correctly"
    );

    if let Err(e) = create_volume(&volume_name).await {
        println!("⚠️ Warning when creating volume: {}", e);
    }

    let container_id = run_docker_command(command).await;

    if let Err(e) = container_id {
        clean_container(container_name).await;
        clean_volume(&volume_name).await;
        panic!("Docker failed to create MySQL container with volume: {}", e);
    }

    println!("✅ MySQL container with volume created successfully");

    wait_for_container(5).await;

    assert!(container_exists(container_name).await, "Container should exist");
    assert!(volume_exists(&volume_name).await, "Volume should exist");

    // Cleanup
    clean_container(container_name).await;
    clean_volume(&volume_name).await;

    println!("✅ MySQL volume test completed");
}
