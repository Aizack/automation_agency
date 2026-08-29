# Graph Report - Bot multi-tenant  (2026-08-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 577 nodes · 981 edges · 51 communities (39 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `64129fe9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- postgres.ts
- dependencies
- SaaSErpInventory.tsx
- react
- ClientDashboard.tsx
- authFetch
- compilerOptions
- server.ts
- compilerOptions
- devDependencies
- dashboard/package.json
- devDependencies
- whatsapp.ts
- StructuredLogger
- shutdownManager.ts
- logger.ts
- compilerOptions
- RestaurantWaiterPortal.tsx
- pdfGeneratorService.ts
- electronicInvoiceService.ts
- AdminDashboard.tsx
- SaaSErpEmployees.tsx
- .oxlintrc.json
- EnterprisePlanningModule.tsx
- SaaSErpAccounting.tsx
- SaaSErpUsers.tsx
- server
- rateLimiter.ts
- plugins
- RestaurantMenuBuilder.tsx
- SaaSErpCampaigns.tsx
- SaaSErpCRM.tsx
- SaaSErpFormulas.tsx
- SaaSErpSuppliers.tsx
- scheduler.ts
- test-pre-recorded-voice.ts
- envValidator.ts
- @types/node
- dashboard/tsconfig.json
- check-db-users.ts
- migration-agent-contacts.ts
- seed-admin-user.ts
- test-list-models.ts
- update-client-auth.ts
- @tailwindcss/vite
- install-docker.sh
- setup-nginx.sh
- setup-ssl.sh
- setup-vps.sh

## God Nodes (most connected - your core abstractions)
1. `react` - 34 edges
2. `pool` - 32 edges
3. `compilerOptions` - 18 edges
4. `getClientById()` - 15 edges
5. `authFetch()` - 15 edges
6. `compilerOptions` - 15 edges
7. `AIAgent` - 13 edges
8. `fetchDocumentsFromDrive()` - 11 edges
9. `routeIncomingMessage()` - 10 edges
10. `StructuredLogger` - 9 edges

## Surprising Connections (you probably didn't know these)
- `runValidation()` --calls--> `initDatabase()`  [EXTRACTED]
  scratch/test_restaurant_validation.ts → src/database/initDb.ts
- `initializeWhatsAppClient()` --calls--> `routeIncomingMessage()`  [EXTRACTED]
  src/services/whatsapp.ts → src/core/router.ts
- `initializeWhatsAppClient()` --calls--> `getClientById()`  [EXTRACTED]
  src/services/whatsapp.ts → src/database/clientsCrud.ts
- `initializeWhatsAppClient()` --calls--> `uploadTenantFile()`  [EXTRACTED]
  src/services/whatsapp.ts → src/services/storageService.ts
- `AdminDashboard()` --calls--> `authFetch()`  [EXTRACTED]
  dashboard/src/components/AdminDashboard.tsx → dashboard/src/utils/api.ts

## Import Cycles
- 2-file cycle: `src/server.ts -> src/services/shutdownManager.ts -> src/server.ts`

## Communities (51 total, 12 thin omitted)

### Community 0 - "postgres.ts"
Cohesion: 0.07
Nodes (41): AIAgent, genAI, ClientConfig, getClientConfigById(), getClientConfigByPhone(), pendingAgentConfirmations, pendingCustomerConfirmations, routeIncomingMessage() (+33 more)

### Community 1 - "dependencies"
Cohesion: 0.05
Nodes (37): @aws-sdk/client-s3, bcrypt, dotenv, express, @google/generative-ai, googleapis, jsonwebtoken, multer (+29 more)

### Community 2 - "SaaSErpInventory.tsx"
Cohesion: 0.10
Nodes (26): ColorOption, colorOptions, getColorPreview(), Product, PromoDiscountRow(), RotationProduct, SaaSErpInventory(), SaaSErpInventoryProps (+18 more)

### Community 3 - "react"
Cohesion: 0.11
Nodes (21): App(), ActivateAccount(), ActivateAccountProps, AuthFast(), AuthFastProps, ClientDashboard(), LandingPage(), LandingPageProps (+13 more)

### Community 4 - "ClientDashboard.tsx"
Cohesion: 0.08
Nodes (24): AgentContact, AudioContact, Client, ClientDashboardProps, Interaction, WhatsappStatus, RawMaterial, RawMaterialsInventory() (+16 more)

### Community 5 - "authFetch"
Cohesion: 0.10
Nodes (18): Appointment, Customer, formatLocalDateInput(), SaaSErpAppointments(), SaaSErpAppointmentsProps, CarteraProps, Installment, Invoice (+10 more)

### Community 6 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 7 - "server.ts"
Cohesion: 0.12
Nodes (17): deleteClient(), updateClientStatus(), AuthenticatedRequest, authenticateToken(), authorizeClientAccess(), requireRole(), app, diskUpload (+9 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 9 - "devDependencies"
Cohesion: 0.12
Nodes (17): autoprefixer, devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @types/react, @types/react-dom (+9 more)

### Community 10 - "dashboard/package.json"
Cohesion: 0.12
Nodes (16): dependencies, jsbarcode, react, react-dom, name, private, scripts, build (+8 more)

### Community 11 - "devDependencies"
Cohesion: 0.12
Nodes (17): nodemon, devDependencies, nodemon, ssh2, ts-node, @types/express, @types/jsonwebtoken, @types/multer (+9 more)

### Community 12 - "whatsapp.ts"
Cohesion: 0.19
Nodes (14): updateClient(), autoRestoreSavedWhatsAppSessions(), client, connectWhatsApp(), getWhatsAppState(), initializeWhatsAppClient(), logoutWhatsApp(), sendWhatsAppTextMessage() (+6 more)

### Community 13 - "StructuredLogger"
Cohesion: 0.23
Nodes (7): correlationIdMiddleware(), Express, Request, errorHandler(), generateCorrelationId(), LogContext, StructuredLogger

### Community 14 - "shutdownManager.ts"
Cohesion: 0.29
Nodes (9): runTest(), STATE_FILE_PATH, stopEscalationService(), captureSystemState(), gracefulShutdown(), registerShutdownHandlers(), restoreSystemState(), STATE_FILE_PATH (+1 more)

### Community 15 - "logger.ts"
Cohesion: 0.18
Nodes (5): AppError, asyncHandler(), alertThrottleMap, logger, LOGS_DIR

### Community 16 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, outDir, rootDir, skipLibCheck, strict (+3 more)

### Community 17 - "RestaurantWaiterPortal.tsx"
Cohesion: 0.20
Nodes (9): DocRequest, EmployeePortal(), Task, Employee, Product, RestaurantWaiterPortal(), RestaurantWaiterPortalProps, SelectedOrderItem (+1 more)

### Community 18 - "pdfGeneratorService.ts"
Cohesion: 0.36
Nodes (7): main(), generatePOSThermalTicketHTML(), getInvoicePrintData(), InvoicePrintData, getS3Client(), isR2Configured(), uploadTenantFile()

### Community 19 - "electronicInvoiceService.ts"
Cohesion: 0.33
Nodes (8): AuditLogOptions, logAudit(), logReqAudit(), calculateCUFE(), checkElectronicInvoicePermission(), ElectronicInvoiceResult, generateFiscalQR(), processElectronicInvoice()

### Community 20 - "AdminDashboard.tsx"
Cohesion: 0.25
Nodes (7): AdminDashboard(), AdminDashboardProps, Client, Metrics, SystemAlert, SystemAlertsPanel(), SystemAlertsPanelProps

### Community 21 - "SaaSErpEmployees.tsx"
Cohesion: 0.28
Nodes (7): Department, Employee, MODULES, SaaSErpEmployees(), SaaSErpEmployeesProps, Shift, translateErrorMessage()

### Community 22 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): rules, react/only-export-components, react/rules-of-hooks, $schema, warn

### Community 23 - "EnterprisePlanningModule.tsx"
Cohesion: 0.33
Nodes (5): Asset, EnterprisePlanningModule(), EnterprisePlanningModuleProps, GrowthInsights, Liability

### Community 24 - "SaaSErpAccounting.tsx"
Cohesion: 0.33
Nodes (5): AccountingSummary, DailyTrendItem, SaaSErpAccounting(), SaaSErpAccountingProps, TopProduct

### Community 25 - "SaaSErpUsers.tsx"
Cohesion: 0.33
Nodes (5): ALL_MODULES, ROLE_LABELS, SaaSErpUsers(), SaaSErpUsersProps, TenantUser

### Community 26 - "server"
Cohesion: 0.47
Nodes (4): runValidation(), initDatabase(), server, startEscalationService()

### Community 27 - "rateLimiter.ts"
Cohesion: 0.33
Nodes (4): authRateLimiter, generalApiLimiter, RateLimitStore, seedRateLimiter

### Community 28 - "plugins"
Cohesion: 0.40
Nodes (5): plugins, typescript, typescript, oxc, typescript

### Community 29 - "RestaurantMenuBuilder.tsx"
Cohesion: 0.40
Nodes (4): Product, RecipeItem, RestaurantMenuBuilder(), RestaurantMenuBuilderProps

### Community 30 - "SaaSErpCampaigns.tsx"
Cohesion: 0.40
Nodes (4): Employee, SaaSErpCampaigns(), SaaSErpCampaignsProps, Visit

### Community 31 - "SaaSErpCRM.tsx"
Cohesion: 0.40
Nodes (4): Customer, Invoice, SaaSErpCRM(), SaaSErpCRMProps

### Community 32 - "SaaSErpFormulas.tsx"
Cohesion: 0.40
Nodes (4): Customer, Formula, FormulasProps, SaaSErpFormulas()

### Community 33 - "SaaSErpSuppliers.tsx"
Cohesion: 0.40
Nodes (4): Category, SaaSErpSuppliers(), Supplier, SuppliersProps

### Community 34 - "scheduler.ts"
Cohesion: 0.70
Nodes (4): checkAndSendReminders(), delay(), formatCurrency(), startScheduler()

### Community 36 - "envValidator.ts"
Cohesion: 0.50
Nodes (3): REQUIRED_VARS, validateEnv(), WARN_VARS

### Community 37 - "@types/node"
Cohesion: 0.67
Nodes (3): @types/node, @types/node, @types/node

## Knowledge Gaps
- **240 isolated node(s):** `ExtendedRequest`, `AsignarTareaArgs`, `ConsultarEstadoCuentaArgs`, `ConsultarInventarioArgs`, `ReportarPagoArgs` (+235 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `SaaSErpFormulas.tsx`, `SaaSErpSuppliers.tsx`, `SaaSErpInventory.tsx`, `ClientDashboard.tsx`, `authFetch`, `RestaurantWaiterPortal.tsx`, `AdminDashboard.tsx`, `SaaSErpEmployees.tsx`, `EnterprisePlanningModule.tsx`, `SaaSErpAccounting.tsx`, `SaaSErpUsers.tsx`, `plugins`, `RestaurantMenuBuilder.tsx`, `SaaSErpCampaigns.tsx`, `SaaSErpCRM.tsx`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `react`, `.oxlintrc.json`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **What connects `ExtendedRequest`, `AsignarTareaArgs`, `ConsultarEstadoCuentaArgs` to the rest of the system?**
  _240 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `postgres.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07496194824961948 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `SaaSErpInventory.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09879032258064516 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.10837438423645321 - nodes in this community are weakly interconnected._