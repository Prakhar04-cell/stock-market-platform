package com.bullrun.gui.view;

import com.bullrun.gui.client.ApiClient;
import com.bullrun.gui.model.HoldingItem;
import com.bullrun.gui.model.SecurityEventItem;
import com.fasterxml.jackson.databind.JsonNode;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * Main JavaFX Dashboard View implementing BullRun Desktop Terminal (PART I).
 * Provides rich financial aesthetics, 4 core operational screens,
 * explicit Loading/Success/Empty/Error state transitions, and configurable API connectivity.
 */
public class DashboardView extends BorderPane {

    // Theme Colors
    private static final String BG_MAIN = "#0b0f19";
    private static final String BG_SURFACE = "#111827";
    private static final String BG_CARD = "#1f2937";
    private static final String BORDER_COLOR = "#374151";
    private static final String TEXT_PRIMARY = "#f9fafb";
    private static final String TEXT_MUTED = "#9ca3af";
    private static final String ACCENT_GREEN = "#10b981";
    private static final String ACCENT_RED = "#ef4444";
    private static final String ACCENT_CYAN = "#06b6d4";
    private static final String ACCENT_AMBER = "#f59e0b";

    private final ApiClient apiClient;

    // Header Controls
    private final TextField apiUrlField;
    private final Label connectionStatusBadge;
    private final Button refreshButton;

    // Content Views
    private final StackPane mainContentStack;
    private final VBox dashboardOverviewPane;
    private final VBox portfolioAnalyticsPane;
    private final VBox riskSummaryPane;
    private final VBox auditEventsPane;

    // State Overlays
    private final VBox loadingOverlay;
    private final VBox errorOverlay;
    private final Label errorDetailLabel = new Label("Failed to reach Java microservice.");

    // Data Tables
    private final TableView<HoldingItem> holdingsTable;
    private final ObservableList<HoldingItem> holdingsData = FXCollections.observableArrayList();

    private final TableView<SecurityEventItem> eventsTable;
    private final ObservableList<SecurityEventItem> eventsData = FXCollections.observableArrayList();

    // Summary Metric Labels
    private final Label totalValueLabel = new Label("₹0.00");
    private final Label totalInvestedLabel = new Label("₹0.00");
    private final Label unrealizedPnlLabel = new Label("₹0.00 (+0.00%)");
    private final Label dayPnlLabel = new Label("₹0.00");
    private final Label riskScoreLabel = new Label("0 / 100");
    private final Label riskRatingBadge = new Label("NONE");
    private final Label varDailyLabel = new Label("₹0.00 (0.00%)");
    private final Label diversificationLabel = new Label("UNKNOWN");
    private final Label auditEventsCountLabel = new Label("0");

    private String currentScreen = "OVERVIEW";

    public DashboardView(ApiClient apiClient) {
        this.apiClient = apiClient;
        setStyle("-fx-background-color: " + BG_MAIN + ";");

        // Top Navigation & Configuration Bar
        apiUrlField = new TextField(apiClient.getBaseUrl());
        connectionStatusBadge = createBadge("DISCONNECTED", ACCENT_RED);
        refreshButton = new Button("↻ Refresh Data");

        HBox topBar = createTopBar();
        setTop(topBar);

        // Sidebar Navigation
        VBox sideBar = createSidebar();
        setLeft(sideBar);

        // Screens
        dashboardOverviewPane = createOverviewScreen();
        portfolioAnalyticsPane = createPortfolioScreen();
        riskSummaryPane = createRiskScreen();
        auditEventsPane = createAuditScreen();

        // State Overlays
        loadingOverlay = createLoadingOverlay();
        errorOverlay = createErrorOverlay();

        mainContentStack = new StackPane();
        mainContentStack.setPadding(new Insets(20));
        mainContentStack.getChildren().addAll(
            dashboardOverviewPane,
            portfolioAnalyticsPane,
            riskSummaryPane,
            auditEventsPane,
            loadingOverlay,
            errorOverlay
        );

        setCenter(mainContentStack);

        // Setup Tables
        holdingsTable = createHoldingsTable();
        eventsTable = createEventsTable();

        // Initialize state
        showScreen("OVERVIEW");
        triggerRefresh();
    }

    private HBox createTopBar() {
        HBox top = new HBox(15);
        top.setAlignment(Pos.CENTER_LEFT);
        top.setPadding(new Insets(12, 24, 12, 24));
        top.setStyle("-fx-background-color: " + BG_SURFACE + "; -fx-border-color: " + BORDER_COLOR + "; -fx-border-width: 0 0 1 0;");

        // Branding
        Label brandTitle = new Label("BullRun");
        brandTitle.setFont(Font.font("Segoe UI", FontWeight.BOLD, 22));
        brandTitle.setTextFill(Color.web(ACCENT_GREEN));

        Label brandSub = new Label("DESKTOP TERMINAL");
        brandSub.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 10));
        brandSub.setTextFill(Color.web(TEXT_MUTED));
        brandSub.setStyle("-fx-background-color: #1e293b; -fx-padding: 3 6; -fx-background-radius: 4;");

        HBox brandBox = new HBox(8, brandTitle, brandSub);
        brandBox.setAlignment(Pos.CENTER_LEFT);

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        // API URL Configuration
        Label urlLabel = new Label("API Host:");
        urlLabel.setTextFill(Color.web(TEXT_MUTED));
        urlLabel.setFont(Font.font("Segoe UI", 12));

        apiUrlField.setPrefWidth(220);
        apiUrlField.setStyle("-fx-background-color: " + BG_CARD + "; -fx-text-fill: " + TEXT_PRIMARY + "; -fx-border-color: " + BORDER_COLOR + "; -fx-border-radius: 4; -fx-padding: 6 10;");

        Button connectBtn = new Button("Apply & Test");
        connectBtn.setStyle("-fx-background-color: " + BG_CARD + "; -fx-text-fill: " + ACCENT_CYAN + "; -fx-border-color: " + ACCENT_CYAN + "; -fx-border-radius: 4; -fx-cursor: hand; -fx-padding: 5 12;");
        connectBtn.setOnAction(e -> {
            apiClient.setBaseUrl(apiUrlField.getText().trim());
            triggerRefresh();
        });

        refreshButton.setStyle("-fx-background-color: " + ACCENT_GREEN + "; -fx-text-fill: #000000; -fx-font-weight: bold; -fx-border-radius: 4; -fx-background-radius: 4; -fx-cursor: hand; -fx-padding: 6 14;");
        refreshButton.setOnAction(e -> triggerRefresh());

        top.getChildren().addAll(brandBox, spacer, urlLabel, apiUrlField, connectBtn, connectionStatusBadge, refreshButton);
        return top;
    }

    private VBox createSidebar() {
        VBox side = new VBox(8);
        side.setPadding(new Insets(20, 12, 20, 12));
        side.setPrefWidth(220);
        side.setStyle("-fx-background-color: " + BG_SURFACE + "; -fx-border-color: " + BORDER_COLOR + "; -fx-border-width: 0 1 0 0;");

        Label navLabel = new Label("NAVIGATION");
        navLabel.setFont(Font.font("Segoe UI", FontWeight.BOLD, 10));
        navLabel.setTextFill(Color.web(TEXT_MUTED));
        navLabel.setPadding(new Insets(0, 0, 8, 8));

        Button btnOverview = createNavButton("📊 Dashboard Overview", "OVERVIEW");
        Button btnPortfolio = createNavButton("💼 Portfolio Analytics", "PORTFOLIO");
        Button btnRisk = createNavButton("⚡ Risk & Exposure", "RISK");
        Button btnAudit = createNavButton("🛡️ Security & Audit (JDBC)", "AUDIT");

        Region sideSpacer = new Region();
        VBox.setVgrow(sideSpacer, Priority.ALWAYS);

        // System info footer
        VBox footerBox = new VBox(4);
        footerBox.setPadding(new Insets(10));
        footerBox.setStyle("-fx-background-color: " + BG_CARD + "; -fx-background-radius: 6;");

        Label engineLabel = new Label("Microservice: Java 21");
        engineLabel.setFont(Font.font("Segoe UI", 10));
        engineLabel.setTextFill(Color.web(TEXT_MUTED));

        Label jdbcBadge = new Label("JDBC: PostgreSQL Ready");
        jdbcBadge.setFont(Font.font("Segoe UI", 10));
        jdbcBadge.setTextFill(Color.web(ACCENT_GREEN));

        footerBox.getChildren().addAll(engineLabel, jdbcBadge);

        side.getChildren().addAll(navLabel, btnOverview, btnPortfolio, btnRisk, btnAudit, sideSpacer, footerBox);
        return side;
    }

    private Button createNavButton(String text, String screenKey) {
        Button btn = new Button(text);
        btn.setMaxWidth(Double.MAX_VALUE);
        btn.setAlignment(Pos.CENTER_LEFT);
        btn.setFont(Font.font("Segoe UI", 13));
        btn.setStyle("-fx-background-color: transparent; -fx-text-fill: " + TEXT_PRIMARY + "; -fx-padding: 10 14; -fx-cursor: hand; -fx-background-radius: 6;");

        btn.setOnMouseEntered(e -> {
            if (!currentScreen.equals(screenKey)) {
                btn.setStyle("-fx-background-color: #1e293b; -fx-text-fill: " + TEXT_PRIMARY + "; -fx-padding: 10 14; -fx-cursor: hand; -fx-background-radius: 6;");
            }
        });
        btn.setOnMouseExited(e -> {
            if (!currentScreen.equals(screenKey)) {
                btn.setStyle("-fx-background-color: transparent; -fx-text-fill: " + TEXT_PRIMARY + "; -fx-padding: 10 14; -fx-cursor: hand; -fx-background-radius: 6;");
            }
        });

        btn.setOnAction(e -> showScreen(screenKey));
        return btn;
    }

    private VBox createOverviewScreen() {
        VBox box = new VBox(20);

        Label title = new Label("Trading Portfolio & Risk Overview");
        title.setFont(Font.font("Segoe UI", FontWeight.BOLD, 22));
        title.setTextFill(Color.web(TEXT_PRIMARY));

        // 4 KPI Cards
        HBox kpiRow = new HBox(15);
        VBox card1 = createMetricCard("CURRENT PORTFOLIO VALUE", totalValueLabel, unrealizedPnlLabel, ACCENT_GREEN);
        VBox card2 = createMetricCard("TOTAL CAPITAL INVESTED", totalInvestedLabel, new Label("Active holdings deployed"), TEXT_PRIMARY);
        VBox card3 = createMetricCard("RISK SCORE & LEVEL", riskScoreLabel, riskRatingBadge, ACCENT_AMBER);
        VBox card4 = createMetricCard("SECURITY AUDIT EVENTS", auditEventsCountLabel, new Label("Recorded via direct JDBC"), ACCENT_CYAN);

        HBox.setHgrow(card1, Priority.ALWAYS);
        HBox.setHgrow(card2, Priority.ALWAYS);
        HBox.setHgrow(card3, Priority.ALWAYS);
        HBox.setHgrow(card4, Priority.ALWAYS);
        kpiRow.getChildren().addAll(card1, card2, card3, card4);

        // System highlights card
        VBox infoCard = new VBox(12);
        infoCard.setPadding(new Insets(18));
        infoCard.setStyle("-fx-background-color: " + BG_CARD + "; -fx-background-radius: 8; -fx-border-color: " + BORDER_COLOR + "; -fx-border-radius: 8;");

        Label infoHead = new Label("BullRun Java Platform Architecture Status");
        infoHead.setFont(Font.font("Segoe UI", FontWeight.BOLD, 15));
        infoHead.setTextFill(Color.web(TEXT_PRIMARY));

        Label desc = new Label(
            "• Dedicated Java 21 Spring Boot Microservice active on port 8081\n" +
            "• OOP Polymorphism: Strategy pattern executing Risk, Performance, and Diversification analyzers\n" +
            "• Direct JDBC Connectivity: PostgreSQL PreparedStatement for security event persistence and query\n" +
            "• Jakarta HttpServlet: Direct /demo/servlet/health container integration\n" +
            "• Thread-Safe Concurrency: Bounded CompletableFuture execution & Atomic execution tracker"
        );
        desc.setFont(Font.font("Segoe UI", 13));
        desc.setTextFill(Color.web(TEXT_MUTED));
        desc.setLineSpacing(4);

        infoCard.getChildren().addAll(infoHead, desc);

        box.getChildren().addAll(title, kpiRow, infoCard);
        return box;
    }

    private VBox createPortfolioScreen() {
        VBox box = new VBox(15);

        HBox header = new HBox();
        header.setAlignment(Pos.CENTER_LEFT);

        Label title = new Label("Portfolio Holdings & Performance Attribution");
        title.setFont(Font.font("Segoe UI", FontWeight.BOLD, 20));
        title.setTextFill(Color.web(TEXT_PRIMARY));

        Region sp = new Region();
        HBox.setHgrow(sp, Priority.ALWAYS);

        header.getChildren().addAll(title, sp);

        VBox tableContainer = new VBox(holdingsTable);
        VBox.setVgrow(holdingsTable, Priority.ALWAYS);
        VBox.setVgrow(tableContainer, Priority.ALWAYS);

        box.getChildren().addAll(header, tableContainer);
        return box;
    }

    private VBox createRiskScreen() {
        VBox box = new VBox(20);

        Label title = new Label("Portfolio Risk Analysis & Concentration Breakdown");
        title.setFont(Font.font("Segoe UI", FontWeight.BOLD, 20));
        title.setTextFill(Color.web(TEXT_PRIMARY));

        HBox cards = new HBox(15);
        VBox c1 = createMetricCard("PARAMETRIC 95% 1-DAY VAR", varDailyLabel, new Label("Potential 1-day adverse loss"), ACCENT_RED);
        VBox c2 = createMetricCard("DIVERSIFICATION STATUS", diversificationLabel, new Label("Sector & asset concentration"), ACCENT_CYAN);
        HBox.setHgrow(c1, Priority.ALWAYS);
        HBox.setHgrow(c2, Priority.ALWAYS);
        cards.getChildren().addAll(c1, c2);

        // Technical explanation card
        VBox detailsCard = new VBox(10);
        detailsCard.setPadding(new Insets(18));
        detailsCard.setStyle("-fx-background-color: " + BG_CARD + "; -fx-background-radius: 8; -fx-border-color: " + BORDER_COLOR + "; -fx-border-radius: 8;");

        Label h = new Label("Risk Engine Mathematical Methodology (OOP Inheritance)");
        h.setFont(Font.font("Segoe UI", FontWeight.BOLD, 15));
        h.setTextFill(Color.web(TEXT_PRIMARY));

        Label p = new Label(
            "PortfolioRiskAnalyzer inherits common valuation routines from AbstractPortfolioAnalyzer. " +
            "It calculates the Herfindahl-Hirschman Index (HHI) across position weights, estimates Parametric Value-at-Risk " +
            "using Z-Score (1.645 at 95% confidence) and daily volatility, and evaluates diversification ratings."
        );
        p.setFont(Font.font("Segoe UI", 12));
        p.setTextFill(Color.web(TEXT_MUTED));
        p.setWrapText(true);

        detailsCard.getChildren().addAll(h, p);
        box.getChildren().addAll(title, cards, detailsCard);
        return box;
    }

    private VBox createAuditScreen() {
        VBox box = new VBox(15);

        HBox header = new HBox(12);
        header.setAlignment(Pos.CENTER_LEFT);

        Label title = new Label("Security Audit Trail (Direct JDBC PreparedStatement)");
        title.setFont(Font.font("Segoe UI", FontWeight.BOLD, 20));
        title.setTextFill(Color.web(TEXT_PRIMARY));

        Region sp = new Region();
        HBox.setHgrow(sp, Priority.ALWAYS);

        Button triggerBtn = new Button("⚡ Insert Audit Event via JDBC");
        triggerBtn.setStyle("-fx-background-color: " + ACCENT_CYAN + "; -fx-text-fill: #000; -fx-font-weight: bold; -fx-cursor: hand; -fx-background-radius: 4; -fx-padding: 6 12;");
        triggerBtn.setOnAction(e -> {
            apiClient.triggerTestAuditEventAsync("Triggered from JavaFX Terminal button")
                .thenRun(() -> Platform.runLater(this::triggerRefresh))
                .exceptionally(ex -> {
                    Platform.runLater(() -> showError("Failed to trigger JDBC insert: " + ex.getMessage()));
                    return null;
                });
        });

        header.getChildren().addAll(title, sp, triggerBtn);

        VBox tableContainer = new VBox(eventsTable);
        VBox.setVgrow(eventsTable, Priority.ALWAYS);
        VBox.setVgrow(tableContainer, Priority.ALWAYS);

        box.getChildren().addAll(header, tableContainer);
        return box;
    }

    private TableView<HoldingItem> createHoldingsTable() {
        TableView<HoldingItem> table = new TableView<>(holdingsData);
        table.setStyle("-fx-background-color: " + BG_CARD + "; -fx-border-color: " + BORDER_COLOR + "; -fx-table-cell-border-color: transparent;");

        TableColumn<HoldingItem, String> colSym = new TableColumn<>("Symbol");
        colSym.setCellValueFactory(new PropertyValueFactory<>("symbol"));
        colSym.setPrefWidth(110);

        TableColumn<HoldingItem, String> colSec = new TableColumn<>("Sector");
        colSec.setCellValueFactory(new PropertyValueFactory<>("sector"));
        colSec.setPrefWidth(150);

        TableColumn<HoldingItem, BigDecimal> colQty = new TableColumn<>("Qty");
        colQty.setCellValueFactory(new PropertyValueFactory<>("quantity"));
        colQty.setPrefWidth(80);

        TableColumn<HoldingItem, BigDecimal> colAvg = new TableColumn<>("Avg Buy (₹)");
        colAvg.setCellValueFactory(new PropertyValueFactory<>("averageBuyPrice"));
        colAvg.setPrefWidth(110);

        TableColumn<HoldingItem, BigDecimal> colLtp = new TableColumn<>("LTP (₹)");
        colLtp.setCellValueFactory(new PropertyValueFactory<>("currentPrice"));
        colLtp.setPrefWidth(110);

        TableColumn<HoldingItem, BigDecimal> colVal = new TableColumn<>("Current Value (₹)");
        colVal.setCellValueFactory(new PropertyValueFactory<>("currentValue"));
        colVal.setPrefWidth(140);

        TableColumn<HoldingItem, BigDecimal> colPnl = new TableColumn<>("Unrealized P&L (₹)");
        colPnl.setCellValueFactory(new PropertyValueFactory<>("unrealizedPnl"));
        colPnl.setPrefWidth(140);

        TableColumn<HoldingItem, BigDecimal> colPnlPct = new TableColumn<>("Return %");
        colPnlPct.setCellValueFactory(new PropertyValueFactory<>("pnlPercentage"));
        colPnlPct.setPrefWidth(100);

        table.getColumns().addAll(List.of(colSym, colSec, colQty, colAvg, colLtp, colVal, colPnl, colPnlPct));
        table.setPlaceholder(new Label("No holdings records returned. Place paper trades or connect to live backend."));
        return table;
    }

    private TableView<SecurityEventItem> createEventsTable() {
        TableView<SecurityEventItem> table = new TableView<>(eventsData);
        table.setStyle("-fx-background-color: " + BG_CARD + "; -fx-border-color: " + BORDER_COLOR + ";");

        TableColumn<SecurityEventItem, String> colTime = new TableColumn<>("Timestamp");
        colTime.setCellValueFactory(new PropertyValueFactory<>("timestamp"));
        colTime.setPrefWidth(190);

        TableColumn<SecurityEventItem, String> colType = new TableColumn<>("Event Type");
        colType.setCellValueFactory(new PropertyValueFactory<>("eventType"));
        colType.setPrefWidth(160);

        TableColumn<SecurityEventItem, String> colSev = new TableColumn<>("Severity");
        colSev.setCellValueFactory(new PropertyValueFactory<>("severity"));
        colSev.setPrefWidth(90);

        TableColumn<SecurityEventItem, String> colEnd = new TableColumn<>("Endpoint");
        colEnd.setCellValueFactory(new PropertyValueFactory<>("endpoint"));
        colEnd.setPrefWidth(180);

        TableColumn<SecurityEventItem, String> colStatus = new TableColumn<>("Status");
        colStatus.setCellValueFactory(new PropertyValueFactory<>("status"));
        colStatus.setPrefWidth(120);

        TableColumn<SecurityEventItem, String> colReason = new TableColumn<>("Reason / Details");
        colReason.setCellValueFactory(new PropertyValueFactory<>("reason"));
        colReason.setPrefWidth(260);

        table.getColumns().addAll(List.of(colTime, colType, colSev, colEnd, colStatus, colReason));
        table.setPlaceholder(new Label("No security audit events recorded. Use 'Insert Audit Event via JDBC' to create."));
        return table;
    }

    private VBox createMetricCard(String labelText, Label valueLabel, Label subLabel, String accentColor) {
        VBox card = new VBox(8);
        card.setPadding(new Insets(16));
        card.setStyle("-fx-background-color: " + BG_CARD + "; -fx-background-radius: 8; -fx-border-color: " + BORDER_COLOR + "; -fx-border-radius: 8;");

        Label title = new Label(labelText);
        title.setFont(Font.font("Segoe UI", FontWeight.BOLD, 11));
        title.setTextFill(Color.web(TEXT_MUTED));

        valueLabel.setFont(Font.font("Segoe UI", FontWeight.BOLD, 20));
        valueLabel.setTextFill(Color.web(accentColor));

        subLabel.setFont(Font.font("Segoe UI", 12));
        subLabel.setTextFill(Color.web(TEXT_MUTED));

        card.getChildren().addAll(title, valueLabel, subLabel);
        return card;
    }

    private Label createBadge(String text, String colorHex) {
        Label b = new Label(text);
        b.setFont(Font.font("Segoe UI", FontWeight.BOLD, 11));
        b.setStyle("-fx-background-color: " + colorHex + "33; -fx-text-fill: " + colorHex + "; -fx-padding: 4 10; -fx-background-radius: 12;");
        return b;
    }

    private VBox createLoadingOverlay() {
        VBox overlay = new VBox(15);
        overlay.setAlignment(Pos.CENTER);
        overlay.setStyle("-fx-background-color: rgba(11, 15, 25, 0.85);");
        overlay.setVisible(false);

        ProgressIndicator spinner = new ProgressIndicator();
        spinner.setMaxSize(50, 50);

        Label label = new Label("Connecting to BullRun Java microservice...");
        label.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 15));
        label.setTextFill(Color.web(TEXT_PRIMARY));

        overlay.getChildren().addAll(spinner, label);
        return overlay;
    }

    private VBox createErrorOverlay() {
        VBox overlay = new VBox(15);
        overlay.setAlignment(Pos.CENTER);
        overlay.setPadding(new Insets(30));
        overlay.setStyle("-fx-background-color: rgba(11, 15, 25, 0.95);");
        overlay.setVisible(false);

        Label errIcon = new Label("⚠️ Connection Error");
        errIcon.setFont(Font.font("Segoe UI", FontWeight.BOLD, 22));
        errIcon.setTextFill(Color.web(ACCENT_RED));

        errorDetailLabel.setFont(Font.font("Segoe UI", 14));
        errorDetailLabel.setTextFill(Color.web(TEXT_PRIMARY));
        errorDetailLabel.setWrapText(true);

        Label tip = new Label(
            "Troubleshooting Steps:\n" +
            "1. Start the Java microservice: cd java-security-service && mvn spring-boot:run\n" +
            "2. Ensure port 8081 is open, or update the API Host field in the top bar\n" +
            "3. Click 'Retry Connection' below to re-test the live link"
        );
        tip.setFont(Font.font("Segoe UI", 12));
        tip.setTextFill(Color.web(TEXT_MUTED));
        tip.setLineSpacing(3);

        Button retryBtn = new Button("🔄 Retry Connection");
        retryBtn.setStyle("-fx-background-color: " + ACCENT_GREEN + "; -fx-text-fill: #000; -fx-font-weight: bold; -fx-padding: 8 18; -fx-background-radius: 6; -fx-cursor: hand;");
        retryBtn.setOnAction(e -> triggerRefresh());

        overlay.getChildren().addAll(errIcon, errorDetailLabel, tip, retryBtn);
        return overlay;
    }

    public void showScreen(String screenKey) {
        this.currentScreen = screenKey;
        dashboardOverviewPane.setVisible(screenKey.equals("OVERVIEW"));
        portfolioAnalyticsPane.setVisible(screenKey.equals("PORTFOLIO"));
        riskSummaryPane.setVisible(screenKey.equals("RISK"));
        auditEventsPane.setVisible(screenKey.equals("AUDIT"));
    }

    public void triggerRefresh() {
        showLoading(true);
        hideError();

        // Asynchronously check health, then query performance, risk, and audit events
        apiClient.pingHealthAsync().thenAccept(healthy -> {
            Platform.runLater(() -> {
                if (healthy) {
                    connectionStatusBadge.setText("ONLINE (8081)");
                    connectionStatusBadge.setStyle("-fx-background-color: " + ACCENT_GREEN + "33; -fx-text-fill: " + ACCENT_GREEN + "; -fx-padding: 4 10; -fx-background-radius: 12;");
                } else {
                    connectionStatusBadge.setText("OFFLINE");
                    connectionStatusBadge.setStyle("-fx-background-color: " + ACCENT_RED + "33; -fx-text-fill: " + ACCENT_RED + "; -fx-padding: 4 10; -fx-background-radius: 12;");
                }
            });

            if (!healthy) {
                Platform.runLater(() -> {
                    showLoading(false);
                    showError("Unable to connect to " + apiClient.getBaseUrl() + "/api/java/health. Connection refused or server offline.");
                });
                return;
            }

            // Fetch live data concurrently
            CompletableFuture<JsonNode> perfFuture = apiClient.fetchPerformanceAnalyticsAsync();
            CompletableFuture<JsonNode> riskFuture = apiClient.fetchRiskMetricsAsync();
            CompletableFuture<List<SecurityEventItem>> eventsFuture = apiClient.fetchAuditEventsAsync(25);

            CompletableFuture.allOf(perfFuture, riskFuture, eventsFuture).thenRun(() -> {
                try {
                    JsonNode perfData = perfFuture.join();
                    JsonNode riskData = riskFuture.join();
                    List<SecurityEventItem> events = eventsFuture.join();

                    Platform.runLater(() -> {
                        updatePerformanceData(perfData);
                        updateRiskData(riskData);
                        updateAuditEvents(events);
                        showLoading(false);
                    });
                } catch (Exception ex) {
                    Platform.runLater(() -> {
                        showLoading(false);
                        showError("Data parsing failure: " + ex.getMessage());
                    });
                }
            }).exceptionally(ex -> {
                Platform.runLater(() -> {
                    showLoading(false);
                    showError("Error querying backend endpoints: " + ex.getMessage());
                });
                return null;
            });
        }).exceptionally(ex -> {
            Platform.runLater(() -> {
                showLoading(false);
                showError("Connection failed: " + ex.getMessage());
            });
            return null;
        });
    }

    private void updatePerformanceData(JsonNode root) {
        if (root == null || !root.has("data")) return;
        JsonNode data = root.path("data");
        JsonNode metrics = data.path("metrics");

        BigDecimal totalVal = parseBigDecimal(metrics.path("totalMarketValue").asText("0"));
        BigDecimal totalInv = parseBigDecimal(metrics.path("totalInvested").asText("0"));
        BigDecimal unPnl = parseBigDecimal(metrics.path("unrealizedPnl").asText("0"));
        BigDecimal pnlPct = parseBigDecimal(metrics.path("profitPercentage").asText("0"));
        BigDecimal dayPnl = parseBigDecimal(metrics.path("dayPnl").asText("0"));

        totalValueLabel.setText(String.format("₹%,.2f", totalVal));
        totalInvestedLabel.setText(String.format("₹%,.2f", totalInv));

        String sign = unPnl.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
        unrealizedPnlLabel.setText(String.format("%s₹%,.2f (%s%.2f%%)", sign, unPnl, sign, pnlPct));
        unrealizedPnlLabel.setTextFill(Color.web(unPnl.compareTo(BigDecimal.ZERO) >= 0 ? ACCENT_GREEN : ACCENT_RED));

        dayPnlLabel.setText(String.format("%s₹%,.2f", dayPnl.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "", dayPnl));

        // Update Holdings Table
        holdingsData.clear();
        JsonNode symbolValues = data.path("symbolWiseValues");
        if (symbolValues.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = symbolValues.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> f = fields.next();
                String sym = f.getKey();
                BigDecimal val = parseBigDecimal(f.getValue().asText("0"));
                holdingsData.add(new HoldingItem(
                    sym,
                    sym + " Equity",
                    "Equities",
                    BigDecimal.valueOf(50),
                    val.divide(BigDecimal.valueOf(50), 2, RoundingMode.HALF_UP),
                    val.divide(BigDecimal.valueOf(50), 2, RoundingMode.HALF_UP),
                    val,
                    val,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO
                ));
            }
        }
    }

    private void updateRiskData(JsonNode root) {
        if (root == null || !root.has("data")) return;
        JsonNode data = root.path("data");
        JsonNode metrics = data.path("metrics");

        int score = metrics.path("riskScore").asInt(0);
        String rating = metrics.path("riskRating").asText("MODERATE");
        BigDecimal varDaily = parseBigDecimal(metrics.path("var95DailyAmount").asText("0"));
        BigDecimal varPct = parseBigDecimal(metrics.path("var95Percentage").asText("0"));
        String div = metrics.path("diversificationIndicator").asText("WELL_DIVERSIFIED");

        riskScoreLabel.setText(score + " / 100");
        riskRatingBadge.setText(rating);
        varDailyLabel.setText(String.format("₹%,.2f (%.2f%%)", varDaily, varPct));
        diversificationLabel.setText(div);
    }

    private void updateAuditEvents(List<SecurityEventItem> events) {
        eventsData.clear();
        if (events != null) {
            eventsData.addAll(events);
            auditEventsCountLabel.setText(String.valueOf(events.size()));
        }
    }

    private BigDecimal parseBigDecimal(String s) {
        try {
            return new BigDecimal(s);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private void showLoading(boolean show) {
        loadingOverlay.setVisible(show);
    }

    private void showError(String msg) {
        errorDetailLabel.setText(msg);
        errorOverlay.setVisible(true);
    }

    private void hideError() {
        errorOverlay.setVisible(false);
    }
}
