use docker_db_manager_lib::types::docker::*;
use std::collections::HashMap;

#[cfg(test)]
mod generic_commands_tests {
    use super::*;

    /// Helper to create a test DockerRunRequest
    fn create_test_docker_request(name: &str, image: &str, port: i32) -> DockerRunRequest {
        let mut env_vars = HashMap::new();
        env_vars.insert("TEST_VAR".to_string(), "test_value".to_string());

        DockerRunRequest {
            name: name.to_string(),
            docker_args: DockerRunArgs {
                image: image.to_string(),
                env_vars,
                ports: vec![PortMapping {
                    host: port,
                    container: 5432,
                }],
                volumes: vec![VolumeMount {
                    name: format!("{}-data", name),
                    path: "/var/lib/postgresql/data".to_string(),
                }],
                command: vec![],
            },
            metadata: ContainerMetadata {
                id: uuid::Uuid::new_v4().to_string(),
                db_type: "PostgreSQL".to_string(),
                version: "16".to_string(),
                port,
                username: Some("postgres".to_string()),
                password: "test123".to_string(),
                database_name: Some("testdb".to_string()),
                persist_data: true,
                enable_auth: true,
                max_connections: Some(100),
            },
        }
    }

    #[test]
    fn test_docker_run_request_structure() {
        let request = create_test_docker_request("test-postgres", "postgres:16", 5432);

        assert_eq!(request.name, "test-postgres");
        assert_eq!(request.docker_args.image, "postgres:16");
        assert_eq!(request.docker_args.ports.len(), 1);
        assert_eq!(request.docker_args.ports[0].host, 5432);
        assert_eq!(request.docker_args.volumes.len(), 1);
        assert_eq!(request.metadata.db_type, "PostgreSQL");
        assert_eq!(request.metadata.version, "16");
    }

    #[test]
    fn test_port_mapping() {
        let port_mapping = PortMapping {
            host: 5432,
            container: 5432,
        };

        assert_eq!(port_mapping.host, 5432);
        assert_eq!(port_mapping.container, 5432);
    }

    #[test]
    fn test_volume_mount() {
        let volume = VolumeMount {
            name: "test-data".to_string(),
            path: "/data".to_string(),
        };

        assert_eq!(volume.name, "test-data");
        assert_eq!(volume.path, "/data");
    }

    #[test]
    fn test_container_metadata() {
        let metadata = ContainerMetadata {
            id: "test-id".to_string(),
            db_type: "PostgreSQL".to_string(),
            version: "16".to_string(),
            port: 5432,
            username: Some("postgres".to_string()),
            password: "secret".to_string(),
            database_name: Some("mydb".to_string()),
            persist_data: true,
            enable_auth: true,
            max_connections: Some(100),
        };

        assert_eq!(metadata.db_type, "PostgreSQL");
        assert_eq!(metadata.version, "16");
        assert_eq!(metadata.port, 5432);
        assert!(metadata.persist_data);
        assert!(metadata.enable_auth);
        assert_eq!(metadata.max_connections, Some(100));
    }

    #[test]
    fn test_docker_run_args_with_empty_command() {
        let args = DockerRunArgs {
            image: "postgres:16".to_string(),
            env_vars: HashMap::new(),
            ports: vec![],
            volumes: vec![],
            command: vec![],
        };

        assert_eq!(args.image, "postgres:16");
        assert!(args.command.is_empty());
        assert!(args.ports.is_empty());
    }

    #[test]
    fn test_docker_run_args_with_command() {
        let args = DockerRunArgs {
            image: "redis:7".to_string(),
            env_vars: HashMap::new(),
            ports: vec![],
            volumes: vec![],
            command: vec![
                "redis-server".to_string(),
                "--requirepass".to_string(),
                "secret".to_string(),
            ],
        };

        assert_eq!(args.image, "redis:7");
        assert_eq!(args.command.len(), 3);
        assert_eq!(args.command[0], "redis-server");
    }

    #[test]
    fn test_multiple_port_mappings() {
        let request = DockerRunRequest {
            name: "multi-port-test".to_string(),
            docker_args: DockerRunArgs {
                image: "test:1.0".to_string(),
                env_vars: HashMap::new(),
                ports: vec![
                    PortMapping {
                        host: 8080,
                        container: 80,
                    },
                    PortMapping {
                        host: 8443,
                        container: 443,
                    },
                ],
                volumes: vec![],
                command: vec![],
            },
            metadata: ContainerMetadata {
                id: "test-id".to_string(),
                db_type: "Custom".to_string(),
                version: "1.0".to_string(),
                port: 8080,
                username: None,
                password: "".to_string(),
                database_name: None,
                persist_data: false,
                enable_auth: false,
                max_connections: None,
            },
        };

        assert_eq!(request.docker_args.ports.len(), 2);
        assert_eq!(request.docker_args.ports[0].host, 8080);
        assert_eq!(request.docker_args.ports[1].host, 8443);
    }

    #[test]
    fn test_multiple_volumes() {
        let volumes = vec![
            VolumeMount {
                name: "data-vol".to_string(),
                path: "/data".to_string(),
            },
            VolumeMount {
                name: "config-vol".to_string(),
                path: "/config".to_string(),
            },
        ];

        assert_eq!(volumes.len(), 2);
        assert_eq!(volumes[0].name, "data-vol");
        assert_eq!(volumes[1].path, "/config");
    }

    #[test]
    fn test_env_vars_multiple() {
        let mut env_vars = HashMap::new();
        env_vars.insert("POSTGRES_USER".to_string(), "admin".to_string());
        env_vars.insert("POSTGRES_PASSWORD".to_string(), "secret".to_string());
        env_vars.insert("POSTGRES_DB".to_string(), "mydb".to_string());

        let args = DockerRunArgs {
            image: "postgres:16".to_string(),
            env_vars: env_vars.clone(),
            ports: vec![],
            volumes: vec![],
            command: vec![],
        };

        assert_eq!(args.env_vars.len(), 3);
        assert_eq!(
            args.env_vars.get("POSTGRES_USER"),
            Some(&"admin".to_string())
        );
        assert_eq!(
            args.env_vars.get("POSTGRES_PASSWORD"),
            Some(&"secret".to_string())
        );
        assert_eq!(args.env_vars.get("POSTGRES_DB"), Some(&"mydb".to_string()));
    }
}
