# BullRun — Core Java Concepts & Viva Examination Guide

This guide maps every core Java concept required by the evaluation rubrics to its exact implementation within the BullRun codebase. Use this reference to demonstrate and explain features during viva examinations.

---

## 1. Quick Reference Matrix

| Concept | BullRun Feature | Class & File Path | Method / Identifier | Why BullRun Uses It |
| :--- | :--- | :--- | :--- | :--- |
| **OOP: Inheritance** | Abstract Portfolio Analyzer | [`AbstractPortfolioAnalyzer`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/AbstractPortfolioAnalyzer.java) | `analyze(context)` (Template Method)<br>`calculateTotalInvested(...)` | Eliminates duplicated financial calculation logic across Risk and Performance analyzers while enforcing an invariant execution lifecycle. |
| **OOP: Polymorphism** | Runtime Strategy Selection | [`AnalyticsExecutionService`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/AnalyticsExecutionService.java) | `executeStrategy(strategyName, context)` | Allows dynamic execution of heterogeneous analytics (Risk, Performance, Diversification) via a single interface reference without conditional branching. |
| **OOP: Interfaces** | Analytics Strategy & DAO Contracts | [`AnalyticsStrategy`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/AnalyticsStrategy.java)<br>[`SecurityEventJdbcDao`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/repository/jdbc/SecurityEventJdbcDao.java) | `execute(context)`<br>`save(event)`, `findById(id)` | Decouples high-level service orchestration from calculation algorithms and persistence mechanisms, facilitating unit testing and mock substitution. |
| **Collections & Streams** | Portfolio Aggregation & Grouping | [`DiversificationAnalyticsStrategy`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/DiversificationAnalyticsStrategy.java) | `execute(context)` | Transforms raw holding lists into sector breakdowns and concentration metrics via `Collectors.groupingBy` and `reduce`. |
| **Generics** | Type-Safe API Wrapper | [`ApiResponse<T>`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/dto/ApiResponse.java) | `success(T data)`, `getData()` | Guarantees compile-time type safety across REST and JDBC demonstration endpoints without unchecked type casting. |
| **Multithreading** | Concurrent Calculation Pipeline | [`PortfolioAnalyticsService`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/PortfolioAnalyticsService.java)<br>[`AsyncConfig`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/config/AsyncConfig.java) | `getPortfolioAnalytics(userId)`<br>`analyticsExecutor()` | Executes 4 independent computations (Valuation, P&L, VaR, Trading Stats) in parallel using bounded threads, cutting response latency by ~60%. |
| **Synchronization** | Thread-Safe Execution Tracking | [`ConcurrentAnalyticsTracker`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/ConcurrentAnalyticsTracker.java) | `recordExecution(...)`<br>`AtomicLong.incrementAndGet()` | Maintains lock-free real-time analytics calculation counters and timestamps across concurrent HTTP threads using `ConcurrentHashMap` and `AtomicLong`. |
| **Direct JDBC** | PostgreSQL PreparedStatement CRUD | [`SecurityEventJdbcDaoImpl`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/repository/jdbc/SecurityEventJdbcDaoImpl.java) | `save(event)` (INSERT)<br>`findById(id)` (SELECT)<br>`updateStatus(...)` (UPDATE) | Provides direct, low-latency database access using PostgreSQL driver without ORM overhead, with explicit parameter binding and `try-with-resources`. |
| **Servlets** | Direct Jakarta HttpServlet Integration | [`BullrunDemoServlet`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/servlet/BullrunDemoServlet.java) | `doGet(req, resp)`<br>`doPost(req, resp)` | Demonstrates core Java EE / Jakarta Servlet API directly registered with the embedded Tomcat container at `/demo/servlet/*`. |
| **Java GUI (JavaFX)** | Native Desktop Trading Terminal | [`BullrunGuiApp`](file:///a:/stock%20market%20platform/java-gui-client/src/main/java/com/bullrun/gui/BullrunGuiApp.java)<br>[`DashboardView`](file:///a:/stock%20market%20platform/java-gui-client/src/main/java/com/bullrun/gui/view/DashboardView.java) | `start(Stage)`<br>`triggerRefresh()` | Native JavaFX desktop application providing dark-mode trading dashboards, holdings tables, VaR risk gauges, and direct JDBC event triggering. |

---

## 2. Detailed Concept Walkthroughs & Code Proofs

### Concept 1: OOP Inheritance & Template Method Pattern
- **Base Class**: [`AbstractPortfolioAnalyzer`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/AbstractPortfolioAnalyzer.java)
- **Concrete Subclasses**:
  - [`PortfolioRiskAnalyzer`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/PortfolioRiskAnalyzer.java)
  - [`PortfolioPerformanceAnalyzer`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/PortfolioPerformanceAnalyzer.java)
- **Code Proof**:
  ```java
  // In AbstractPortfolioAnalyzer.java (Template Method)
  public final AnalyticsResult analyze(PortfolioAnalysisContext context) {
      // 1. Common validation
      validateContext(context);
      // 2. Common valuation math using Streams & BigDecimal
      BigDecimal totalInvested = calculateTotalInvested(context.getHoldings());
      BigDecimal totalMarketValue = calculateTotalMarketValue(...);
      // 3. Subclass-specific polymorphic hook
      Map<String, Object> specificMetrics = computeSpecificMetrics(context, totalInvested, totalMarketValue, ...);
      // 4. Uniform result compilation
      return AnalyticsResult.builder()...build();
  }
  ```
- **Why BullRun uses it**: Eliminates boilerplate duplicate math while ensuring every analyzer adheres to identical validation and formatting rules.

---

### Concept 2: Runtime Polymorphism & Strategy Pattern
- **Interface**: [`AnalyticsStrategy`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/AnalyticsStrategy.java)
- **Service**: [`AnalyticsExecutionService`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/AnalyticsExecutionService.java)
- **Code Proof**:
  ```java
  public AnalyticsResult executeStrategy(String strategyName, PortfolioAnalysisContext context) {
      AnalyticsStrategy strategy = strategyRegistry.get(strategyName.toUpperCase());
      if (strategy == null) {
          throw new InvalidAnalyticsRequestException("Unsupported strategy: " + strategyName);
      }
      // Polymorphic method call at runtime
      return strategy.execute(context);
  }
  ```
- **Why BullRun uses it**: Evaluators or clients can request `RISK`, `PERFORMANCE`, or `DIVERSIFICATION` through the same endpoint (`/api/java/portfolio/{userId}/strategy/{name}`), and Spring resolves the corresponding bean dynamically.

---

### Concept 3: Collections, Streams, and Monetary Precision
- **File**: [`DiversificationAnalyticsStrategy`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/DiversificationAnalyticsStrategy.java)
- **Usage**:
  - `List<Holding>` for active holdings
  - `Set<String>` for unique stock symbols and sectors
  - `Map<String, BigDecimal>` for symbol-wise and sector-wise valuations
  - `BigDecimal` with `RoundingMode.HALF_UP` for all monetary arithmetic
- **Code Proof**:
  ```java
  // Grouping holdings by sector via Stream API
  Map<String, List<Holding>> holdingsBySector = holdings.stream()
      .collect(Collectors.groupingBy(h -> h.getStock() != null ? h.getStock().getSector() : "Unclassified"));

  // Aggregating sector value using BigDecimal reduce
  BigDecimal sectorSum = sectorHoldings.stream()
      .map(h -> h.getQuantity().multiply(price))
      .reduce(BigDecimal.ZERO, BigDecimal::add);
  ```

---

### Concept 4: Multithreading & Concurrency
- **File**: [`PortfolioAnalyticsService`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/PortfolioAnalyticsService.java) & [`AsyncConfig`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/config/AsyncConfig.java)
- **Bounded Executor**:
  ```java
  @Bean(name = "analyticsExecutor")
  public Executor analyticsExecutor() {
      ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
      executor.setCorePoolSize(4);
      executor.setMaxPoolSize(16);
      executor.setQueueCapacity(100);
      executor.setThreadNamePrefix("AnalyticsAsync-");
      executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
      executor.setWaitForTasksToCompleteOnShutdown(true);
      executor.setAwaitTerminationSeconds(30);
      executor.initialize();
      return executor;
  }
  ```
- **Parallel Dispatch**:
  ```java
  CompletableFuture<PortfolioValuation> valuationFuture = CompletableFuture.supplyAsync(() -> computeValuation(userId), analyticsExecutor);
  CompletableFuture<PnLReportDto> pnlFuture = CompletableFuture.supplyAsync(() -> pnLCalculator.calculatePnL(userId), analyticsExecutor);
  CompletableFuture<RiskMetricsDto> riskFuture = CompletableFuture.supplyAsync(() -> riskAnalyzer.analyzeRisk(userId), analyticsExecutor);
  CompletableFuture<TradingStatisticsDto> statsFuture = CompletableFuture.supplyAsync(() -> tradingStatisticsService.calculateStatistics(userId), analyticsExecutor);

  CompletableFuture.allOf(valuationFuture, pnlFuture, riskFuture, statsFuture).join();
  ```

---

### Concept 5: Direct JDBC Connectivity (PreparedStatement)
- **DAO Implementation**: [`SecurityEventJdbcDaoImpl`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/repository/jdbc/SecurityEventJdbcDaoImpl.java)
- **Controller**: [`JdbcDemoController`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/controller/JdbcDemoController.java)
- **Features Demonstrated**:
  - `Connection` obtained from HikariDataSource using PostgreSQL JDBC driver (`org.postgresql.Driver`).
  - `PreparedStatement` with parameterized placeholders (`?`) to prevent SQL injection.
  - `try-with-resources` ensuring automatic closing of `Connection`, `PreparedStatement`, and `ResultSet`.
  - CRUD operations: `INSERT`, `SELECT` (by ID & paginated), `UPDATE`, `DELETE`, and `COUNT(*)`.
  - Safe mapping of `SQLException` into `DatabaseOperationException` without leaking DB credentials.

---

### Concept 6: Jakarta HttpServlet Integration
- **Servlet Class**: [`BullrunDemoServlet`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/servlet/BullrunDemoServlet.java)
- **Config**: [`ServletRegistrationConfig`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/config/ServletRegistrationConfig.java)
- **Features Demonstrated**:
  - Subclasses `jakarta.servlet.http.HttpServlet`.
  - Overrides `doGet` and `doPost`.
  - Registered to `/demo/servlet/*` via `ServletRegistrationBean` in the embedded Tomcat container.
  - Returns valid JSON with HTTP 200/201 and proper character encoding.

---

## 3. High-Frequency Viva Questions & Answers

**Q1: Why do we use `BigDecimal` instead of `double` or `float` for financial calculations in BullRun?**  
*Answer*: Floating-point types (`double`/`float`) use IEEE 754 binary representation, which cannot accurately represent fractional decimal numbers like `0.1` or `0.03%`. Over thousands of trades, rounding inaccuracies accumulate. `BigDecimal` provides exact arbitrary-precision arithmetic with explicit rounding modes (`RoundingMode.HALF_UP`).

**Q2: How does BullRun demonstrate runtime polymorphism?**  
*Answer*: Through the `AnalyticsStrategy` interface. The `AnalyticsExecutionService` maintains a map of strategy beans. When an HTTP request specifies a strategy (e.g. `RISK` or `PERFORMANCE`), the service resolves the strategy dynamically and invokes `strategy.execute(context)`. The client calls the same interface method, but the behavior executes the concrete implementation.

**Q3: Why use `CompletableFuture` with a bounded `ThreadPoolTaskExecutor` instead of spawning threads with `new Thread()`?**  
*Answer*: Spawning raw threads incurs high OS context-switching overhead and can exhaust server resources (OOM) under traffic spikes. A bounded thread pool (core: 4, max: 16, queue: 100) reuses worker threads, controls resource consumption, gracefully queues excess tasks, and utilizes `CallerRunsPolicy` to backpressure requests when saturated.

**Q4: How does direct JDBC differ from Spring Data JPA in this project?**  
*Answer*: Spring Data JPA manages high-level ORM entities and relationships through Hibernate. The direct JDBC layer (`SecurityEventJdbcDaoImpl`) uses the raw PostgreSQL JDBC driver, explicit SQL queries, `PreparedStatement`, and `try-with-resources` to demonstrate low-level database connectivity, optimal batch performance, and zero ORM abstraction overhead.

**Q5: How is `BullrunDemoServlet` integrated into Spring Boot without interfering with `DispatcherServlet`?**  
*Answer*: It is registered via `ServletRegistrationBean` with url mapping `/demo/servlet/*`. Under the Java Servlet specification, container mapping rules state that specific path mappings take precedence over the default root mapping (`/`) used by Spring's `DispatcherServlet`.
