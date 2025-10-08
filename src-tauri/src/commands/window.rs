use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub async fn open_container_creation_window(app: AppHandle) -> Result<(), String> {
    let mut window_builder = WebviewWindowBuilder::new(
        &app,
        "container-creation",
        WebviewUrl::App("create-container.html".into()),
    )
    .title("Create Database")
    .inner_size(600.0, 500.0)
    .center()
    .resizable(false);

    // macOS-specific styling
    #[cfg(target_os = "macos")]
    {
        window_builder = window_builder
            .hidden_title(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay);
    }

    let _window = window_builder
        .minimizable(false)
        .maximizable(false)
        .build()
        .map_err(|e| format!("Error creating window: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn open_container_edit_window(
    app: AppHandle,
    container_id: String,
) -> Result<(), String> {
    let url = format!("edit-container.html?id={}", container_id);
    let mut window_builder =
        WebviewWindowBuilder::new(&app, "container-edit", WebviewUrl::App(url.into()))
            .title("Edit Container")
            .inner_size(600.0, 500.0)
            .center()
            .resizable(false);

    // macOS-specific styling
    #[cfg(target_os = "macos")]
    {
        window_builder = window_builder
            .hidden_title(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay);
    }

    let _window = window_builder
        .minimizable(false)
        .maximizable(false)
        .build()
        .map_err(|e| format!("Error creating window: {}", e))?;

    Ok(())
}
