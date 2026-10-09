package com.bullrun.gui;

import com.bullrun.gui.client.ApiClient;
import com.bullrun.gui.view.DashboardView;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.stage.Stage;

/**
 * Main JavaFX Application entry point for BullRun Desktop GUI Client (PART I).
 */
public class BullrunGuiApp extends Application {

    public static final String APP_TITLE = "BullRun — JavaFX Paper Trading Desktop Terminal";
    public static final String DEFAULT_API_URL = "http://localhost:8081";

    @Override
    public void start(Stage primaryStage) {
        ApiClient apiClient = new ApiClient(DEFAULT_API_URL);
        DashboardView dashboardView = new DashboardView(apiClient);

        Scene scene = new Scene(dashboardView, 1180, 760);
        primaryStage.setTitle(APP_TITLE);
        primaryStage.setMinWidth(960);
        primaryStage.setMinHeight(640);
        primaryStage.setScene(scene);
        primaryStage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
