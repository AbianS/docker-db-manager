use crate::services::*;
use crate::types::*;
use tauri::{AppHandle, State};

/// NEW: Create database container from generic Docker run request
/// This command is database-agnostic and uses the docker args built by the frontend provider
#[tauri::command]
pub async fn create_container_from_docker_args(
    request: DockerRunRequest,
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<DatabaseContainer, String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Create volumes if needed
    for volume in &request.docker_args.volumes {
        docker_service
            .create_volume_if_needed(&app, &volume.name)
            .await?;
    }

    // Build Docker command from generic args
    let docker_args =
        docker_service.build_docker_command_from_args(&request.name, &request.docker_args);

    // Execute Docker run command
    let real_container_id = match docker_service.run_container(&app, &docker_args).await {
        Ok(container_id) => container_id,
        Err(error) => {
            // Cleanup resources on error
            let _ = docker_service
                .force_remove_container_by_name(&app, &request.name)
                .await;

            // Cleanup volumes
            for volume in &request.docker_args.volumes {
                let _ = docker_service
                    .remove_volume_if_exists(&app, &volume.name)
                    .await;
            }

            // Check if it's a port already in use error
            if error.contains("port is already allocated") || error.contains("Bind for") {
                let port_error = CreateContainerError {
                    error_type: "PORT_IN_USE".to_string(),
                    message: format!("Port {} is already in use", request.metadata.port),
                    port: Some(request.metadata.port),
                    details: Some(
                        "You can change the port in the configuration and try again.".to_string(),
                    ),
                };
                return Err(serde_json::to_string(&port_error)
                    .unwrap_or_else(|_| "Port in use error".to_string()));
            }

            // Check if it's a container name already exists error
            if error.contains("name is already in use") || error.contains("already exists") {
                let name_error = CreateContainerError {
                    error_type: "NAME_IN_USE".to_string(),
                    message: format!(
                        "A container with the name '{}' already exists",
                        request.name
                    ),
                    port: None,
                    details: Some("Change the container name and try again.".to_string()),
                };
                return Err(serde_json::to_string(&name_error)
                    .unwrap_or_else(|_| "Name in use error".to_string()));
            }

            // Generic Docker error
            let generic_error = CreateContainerError {
                error_type: "DOCKER_ERROR".to_string(),
                message: "Error creating container".to_string(),
                port: None,
                details: Some(error.to_string()),
            };
            return Err(serde_json::to_string(&generic_error)
                .unwrap_or_else(|_| format!("Docker command failed: {}", error)));
        }
    };

    // Create database object using metadata
    let database = DatabaseContainer {
        id: request.metadata.id.clone(),
        name: request.name.clone(),
        db_type: request.metadata.db_type,
        version: request.metadata.version,
        status: "running".to_string(),
        port: request.metadata.port,
        created_at: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        max_connections: request.metadata.max_connections.unwrap_or(100),
        container_id: Some(real_container_id.clone()),
        stored_password: Some(request.metadata.password.clone()),
        stored_username: request.metadata.username.clone(),
        stored_database_name: request.metadata.database_name.clone(),
        stored_persist_data: request.metadata.persist_data,
        stored_enable_auth: request.metadata.enable_auth,
    };

    // Store in memory
    databases
        .lock()
        .unwrap()
        .insert(request.metadata.id.clone(), database.clone());

    // Persist to store
    let db_map = {
        let map = databases.lock().unwrap();
        map.clone()
    };

    // If saving to store fails, cleanup the created container
    if let Err(store_error) = storage_service.save_databases_to_store(&app, &db_map).await {
        // Remove from memory
        databases.lock().unwrap().remove(&request.metadata.id);

        // Cleanup Docker resources
        let _ = docker_service
            .remove_container(&app, &real_container_id)
            .await;

        // Cleanup volumes
        for volume in &request.docker_args.volumes {
            let _ = docker_service
                .remove_volume_if_exists(&app, &volume.name)
                .await;
        }

        return Err(format!("Error saving configuration: {}", store_error));
    }

    Ok(database)
}

/// NEW: Update database container from generic Docker run request
/// This command is database-agnostic and uses the docker args built by the frontend provider
#[tauri::command]
pub async fn update_container_from_docker_args(
    container_id: String,
    request: DockerRunRequest,
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<DatabaseContainer, String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Get current container info
    let mut container = {
        let db_map = databases.lock().unwrap();
        db_map
            .get(&container_id)
            .cloned()
            .ok_or("Container not found")?
    };

    // Determine if we need to recreate the container
    let name_changed = request.name != container.name;
    let port_changed = request.metadata.port != container.port;
    let persist_data_changed = request.metadata.persist_data != container.stored_persist_data;
    let needs_recreation = name_changed || port_changed || persist_data_changed;

    if needs_recreation {
        // Remove old container
        if let Some(old_id) = &container.container_id {
            docker_service.remove_container(&app, old_id).await?;
        }

        // Handle volume migration if needed
        let old_volumes: Vec<String> = if container.stored_persist_data {
            vec![format!("{}-data", container.name)]
        } else {
            vec![]
        };

        let new_volumes = &request.docker_args.volumes;

        // Case 1: Name changed AND has persistent data -> migrate volume
        if name_changed && container.stored_persist_data && request.metadata.persist_data {
            let old_volume_name = format!("{}-data", container.name);
            let new_volume_name = format!("{}-data", request.name);

            // Get data path from the provider's volume configuration
            let data_path = if let Some(vol) = new_volumes.first() {
                vol.path.as_str()
            } else {
                "/data" // fallback
            };

            docker_service
                .migrate_volume_data(&app, &old_volume_name, &new_volume_name, data_path)
                .await?;

            // Remove old volume after successful migration
            docker_service
                .remove_volume_if_exists(&app, &old_volume_name)
                .await?;
        }
        // Case 2: Enabling persistent data -> create new volume
        else if !container.stored_persist_data && request.metadata.persist_data {
            for volume in new_volumes {
                docker_service
                    .create_volume_if_needed(&app, &volume.name)
                    .await?;
            }
        }
        // Case 3: Disabling persistent data -> cleanup old volumes
        else if container.stored_persist_data && !request.metadata.persist_data {
            for old_volume in &old_volumes {
                docker_service
                    .remove_volume_if_exists(&app, old_volume)
                    .await?;
            }
        }
        // Case 4: Name changed but NO persistent data -> just ensure new volumes exist if needed
        else if name_changed && request.metadata.persist_data {
            for volume in new_volumes {
                docker_service
                    .create_volume_if_needed(&app, &volume.name)
                    .await?;
            }
        }

        // Build Docker command from generic args
        let docker_args =
            docker_service.build_docker_command_from_args(&request.name, &request.docker_args);

        // Execute Docker run command
        let real_container_id = match docker_service.run_container(&app, &docker_args).await {
            Ok(container_id) => container_id,
            Err(error) => {
                // Cleanup resources on error
                let _ = docker_service
                    .force_remove_container_by_name(&app, &request.name)
                    .await;

                // Cleanup new volumes if they were created
                for volume in new_volumes {
                    let _ = docker_service
                        .remove_volume_if_exists(&app, &volume.name)
                        .await;
                }

                // Check if it's a port already in use error
                if error.contains("port is already allocated") || error.contains("Bind for") {
                    let port_error = CreateContainerError {
                        error_type: "PORT_IN_USE".to_string(),
                        message: format!("Port {} is already in use", request.metadata.port),
                        port: Some(request.metadata.port),
                        details: Some(
                            "You can change the port in the configuration and try again."
                                .to_string(),
                        ),
                    };
                    return Err(serde_json::to_string(&port_error)
                        .unwrap_or_else(|_| "Port in use error".to_string()));
                }

                // Check if it's a container name already exists error
                if error.contains("name is already in use") || error.contains("already exists") {
                    let name_error = CreateContainerError {
                        error_type: "NAME_IN_USE".to_string(),
                        message: format!(
                            "A container with the name '{}' already exists",
                            request.name
                        ),
                        port: None,
                        details: Some("Change the container name and try again.".to_string()),
                    };
                    return Err(serde_json::to_string(&name_error)
                        .unwrap_or_else(|_| "Name in use error".to_string()));
                }

                // Generic Docker error
                let generic_error = CreateContainerError {
                    error_type: "DOCKER_ERROR".to_string(),
                    message: "Error updating container".to_string(),
                    port: None,
                    details: Some(error.to_string()),
                };
                return Err(serde_json::to_string(&generic_error)
                    .unwrap_or_else(|_| format!("Docker command failed: {}", error)));
            }
        };

        // Update container info with new values
        container.name = request.name.clone();
        container.port = request.metadata.port;
        container.version = request.metadata.version;
        container.container_id = Some(real_container_id);
        container.status = "running".to_string();
        container.stored_persist_data = request.metadata.persist_data;
        container.stored_enable_auth = request.metadata.enable_auth;
        container.stored_password = Some(request.metadata.password);
        container.stored_username = request.metadata.username;
        container.stored_database_name = request.metadata.database_name;

        if let Some(max_conn) = request.metadata.max_connections {
            container.max_connections = max_conn;
        }
    } else {
        // For non-recreating changes, just update the metadata
        // (currently only max_connections would fall here)
        if let Some(max_conn) = request.metadata.max_connections {
            container.max_connections = max_conn;
        }
    }

    // Update in memory store
    {
        let mut db_map = databases.lock().unwrap();
        db_map.insert(container.id.clone(), container.clone());
    }

    // Save to persistent store
    let db_map = {
        let map = databases.lock().unwrap();
        map.clone()
    };

    // If saving to store fails, we should rollback - but for now just return error
    if let Err(store_error) = storage_service.save_databases_to_store(&app, &db_map).await {
        return Err(format!("Error saving configuration: {}", store_error));
    }

    Ok(container)
}

// REMOVED: Legacy create_database_container command
// Now using create_container_from_docker_args with provider-based system

#[tauri::command]
pub async fn get_all_databases(
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<Vec<DatabaseContainer>, String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Load from store first
    let loaded_databases = storage_service.load_databases_from_store(&app).await?;

    // Update in-memory store
    {
        let mut db_map = databases.lock().unwrap();
        *db_map = loaded_databases;
    }

    // Sync with Docker to get real status
    let mut container_map = {
        let db_map = databases.lock().unwrap();
        db_map.clone()
    };
    docker_service
        .sync_containers_with_docker(&app, &mut container_map)
        .await?;

    // Update the database store with synced data
    {
        let mut db_map = databases.lock().unwrap();
        *db_map = container_map;
    }

    // Save updated state and return results
    let (db_map_clone, result) = {
        let db_map = databases.lock().unwrap();
        let clone = db_map.clone();
        let result = db_map.values().cloned().collect();
        (clone, result)
    };
    storage_service
        .save_databases_to_store(&app, &db_map_clone)
        .await?;

    Ok(result)
}

#[tauri::command]
pub async fn start_container(
    container_id: String,
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<(), String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Get container info
    let real_container_id = {
        let db_map = databases.lock().unwrap();
        db_map
            .values()
            .find(|db| db.id == container_id)
            .and_then(|db| db.container_id.as_ref())
            .cloned()
            .ok_or("Container not found")?
    };

    docker_service
        .start_container(&app, &real_container_id)
        .await?;

    // Update status
    {
        let mut db_map = databases.lock().unwrap();
        if let Some(db) = db_map.values_mut().find(|db| db.id == container_id) {
            db.status = "running".to_string();
        }
    }

    let db_map = {
        let map = databases.lock().unwrap();
        map.clone()
    };
    storage_service
        .save_databases_to_store(&app, &db_map)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn stop_container(
    container_id: String,
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<(), String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Get container info
    let real_container_id = {
        let db_map = databases.lock().unwrap();
        db_map
            .values()
            .find(|db| db.id == container_id)
            .and_then(|db| db.container_id.as_ref())
            .cloned()
            .ok_or("Container not found")?
    };

    docker_service
        .stop_container(&app, &real_container_id)
        .await?;

    // Update status
    {
        let mut db_map = databases.lock().unwrap();
        if let Some(db) = db_map.values_mut().find(|db| db.id == container_id) {
            db.status = "stopped".to_string();
        }
    }

    let db_map = {
        let map = databases.lock().unwrap();
        map.clone()
    };
    storage_service
        .save_databases_to_store(&app, &db_map)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn remove_container(
    container_id: String,
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<(), String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Get container info before removing it
    let (real_container_id, container_info) = {
        let db_map = databases.lock().unwrap();
        let container = db_map.values().find(|db| db.id == container_id).cloned();
        let real_id = container
            .as_ref()
            .and_then(|db| db.container_id.as_ref())
            .cloned();
        (real_id, container)
    };

    // If we have a real container ID, try to remove it
    if let Some(real_id) = real_container_id {
        docker_service.remove_container(&app, &real_id).await?;
    }

    // If the container had persistent data, remove its volume
    if let Some(container) = &container_info {
        if container.stored_persist_data {
            let volume_name = format!("{}-data", container.name);
            docker_service
                .remove_volume_if_exists(&app, &volume_name)
                .await?;
        }
    }

    // Always remove from memory and store
    databases.lock().unwrap().remove(&container_id);

    let db_map = {
        let map = databases.lock().unwrap();
        map.clone()
    };
    storage_service
        .save_databases_to_store(&app, &db_map)
        .await?;

    Ok(())
}

// REMOVED: Legacy update_container_config command
// Now using update_container_from_docker_args with provider-based system
