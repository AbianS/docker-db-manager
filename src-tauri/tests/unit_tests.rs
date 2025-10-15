/// Unit tests for Docker DB Manager
///
/// These tests verify individual components and functions in isolation,
/// without requiring Docker to be running.
///
/// Tests are organized by component:
/// - docker_service_test: Tests for DockerService methods
/// - generic_commands_test: Tests for generic command structures (DockerRunRequest, DockerRunArgs, etc.)

#[path = "unit/docker_service_test.rs"]
mod docker_service_test;

#[path = "unit/generic_commands_test.rs"]
mod generic_commands_test;
