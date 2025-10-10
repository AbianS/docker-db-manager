use docker_db_manager_lib::services::DockerService;
use docker_db_manager_lib::types::docker::*;
use std::collections::HashMap;

#[cfg(test)]
mod docker_service_tests {
    use super::*;

    fn create_test_docker_args() -> DockerRunArgs {
        let mut env_vars = HashMap::new();
        env_vars.insert("POSTGRES_USER".to_string(), "postgres".to_string());
        env_vars.insert("POSTGRES_PASSWORD".to_string(), "secret123".to_string());
        env_vars.insert("POSTGRES_DB".to_string(), "testdb".to_string());

        DockerRunArgs {
            image: "postgres:16".to_string(),
            env_vars,
            ports: vec![PortMapping {
                host: 5432,
                container: 5432,
            }],
            volumes: vec![VolumeMount {
                name: "test-postgres-data".to_string(),
                path: "/var/lib/postgresql/data".to_string(),
            }],
            command: vec![],
        }
    }

    #[test]
    fn test_build_docker_command_from_args_basic() {
        let service = DockerService::new();
        let args = create_test_docker_args();

        let command_args = service.build_docker_command_from_args("test-postgres", &args);

        let command = command_args.join(" ");

        // Verify basic structure
        assert!(command.contains("run"));
        assert!(command.contains("-d"));
        assert!(command.contains("--name"));
        assert!(command.contains("test-postgres"));
        assert!(command.contains("postgres:16"));
    }

    #[test]
    fn test_build_docker_command_with_ports() {
        let service = DockerService::new();
        let args = create_test_docker_args();

        let command_args = service.build_docker_command_from_args("test-db", &args);
        let command = command_args.join(" ");

        // Verify port mapping
        assert!(command.contains("-p"));
        assert!(command.contains("5432:5432"));
    }

    #[test]
    fn test_build_docker_command_with_env_vars() {
        let service = DockerService::new();
        let args = create_test_docker_args();

        let command_args = service.build_docker_command_from_args("test-db", &args);
        let command = command_args.join(" ");

        // Verify environment variables
        assert!(command.contains("-e"));
        assert!(command.contains("POSTGRES_USER=postgres"));
        assert!(command.contains("POSTGRES_PASSWORD=secret123"));
        assert!(command.contains("POSTGRES_DB=testdb"));
    }

    #[test]
    fn test_build_docker_command_with_volume() {
        let service = DockerService::new();
        let args = create_test_docker_args();

        let command_args = service.build_docker_command_from_args("test-db", &args);
        let command = command_args.join(" ");

        // Verify volume mount
        assert!(command.contains("-v"));
        assert!(command.contains("test-postgres-data:/var/lib/postgresql/data"));
    }

    #[test]
    fn test_build_docker_command_without_volume() {
        let service = DockerService::new();
        let mut args = create_test_docker_args();
        args.volumes = vec![]; // No volumes

        let command_args = service.build_docker_command_from_args("test-db", &args);
        let command = command_args.join(" ");

        // Should not contain volume flags
        assert!(!command.contains("-v"));
    }

    #[test]
    fn test_build_docker_command_with_command_args() {
        let service = DockerService::new();
        let mut args = create_test_docker_args();
        args.image = "redis:7".to_string();
        args.command = vec![
            "redis-server".to_string(),
            "--requirepass".to_string(),
            "secret".to_string(),
        ];

        let command_args = service.build_docker_command_from_args("test-redis", &args);
        let command = command_args.join(" ");

        // Verify command arguments
        assert!(command.contains("redis-server"));
        assert!(command.contains("--requirepass"));
        assert!(command.contains("secret"));
    }

    #[test]
    fn test_build_docker_command_with_multiple_ports() {
        let service = DockerService::new();
        let mut args = create_test_docker_args();
        args.ports = vec![
            PortMapping {
                host: 8080,
                container: 80,
            },
            PortMapping {
                host: 8443,
                container: 443,
            },
        ];

        let command_args = service.build_docker_command_from_args("test-web", &args);
        let command = command_args.join(" ");

        // Verify multiple port mappings
        assert!(command.contains("8080:80"));
        assert!(command.contains("8443:443"));
    }

    #[test]
    fn test_build_docker_command_with_no_env_vars() {
        let service = DockerService::new();
        let mut args = create_test_docker_args();
        args.env_vars = HashMap::new();

        let command_args = service.build_docker_command_from_args("test-db", &args);
        let command = command_args.join(" ");

        // Should still be valid without env vars
        assert!(command.contains("run"));
        assert!(command.contains("-d"));
    }

    #[test]
    fn test_docker_run_args_serialization() {
        let args = create_test_docker_args();

        // Verify the structure can be serialized
        let json = serde_json::to_string(&args);
        assert!(json.is_ok());

        // Verify it can be deserialized back
        let json_str = json.unwrap();
        let deserialized: Result<DockerRunArgs, _> = serde_json::from_str(&json_str);
        assert!(deserialized.is_ok());

        let recovered = deserialized.unwrap();
        assert_eq!(recovered.image, "postgres:16");
        assert_eq!(recovered.ports.len(), 1);
    }
}
