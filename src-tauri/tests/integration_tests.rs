/// Integration tests for Docker DB Manager
///
/// These tests verify the complete functionality by interacting with real Docker.
/// Docker must be running on the system for these tests to pass.
///
/// Tests are organized by database type and functionality:
/// - PostgreSQL: Basic creation, volumes, and port updates
/// - MySQL: Basic creation and volumes
/// - Redis: Basic creation, auth, and persistence
/// - MongoDB: Basic creation, volumes, and no-auth mode

#[path = "integration/postgresql_integration_test.rs"]
mod postgresql_integration_test;

#[path = "integration/mysql_integration_test.rs"]
mod mysql_integration_test;

#[path = "integration/redis_integration_test.rs"]
mod redis_integration_test;

#[path = "integration/mongodb_integration_test.rs"]
mod mongodb_integration_test;
