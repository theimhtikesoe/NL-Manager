# Factory Floor Management System - Architecture & Schema Design

## Database Schema Overview

### Core Tables

#### 1. Users (Extended from Template)
Tracks all system users with role-based access control.

```
users
├── id (PK, auto-increment)
├── openId (unique, Manus OAuth)
├── name
├── email
├── role (enum: admin, worker)
├── createdAt
├── updatedAt
└── lastSignedIn
```

#### 2. Workers
Factory floor worker profiles and metadata.

```
workers
├── id (PK, auto-increment)
├── userId (FK → users.id)
├── workerCode (unique, e.g., "W001")
├── department (text, e.g., "Production", "Maintenance")
├── position (text, e.g., "Operator", "Supervisor")
├── hireDate (date)
├── status (enum: active, inactive, suspended)
├── qrCodeValue (unique, generated UUID for QR)
├── createdAt
├── updatedAt
└── deletedAt (soft delete)
```

#### 3. Shifts
Work shift definitions and scheduling.

```
shifts
├── id (PK, auto-increment)
├── name (text, e.g., "Morning Shift")
├── startTime (time)
├── endTime (time)
├── description (text)
├── isActive (boolean)
├── createdAt
├── updatedAt
└── deletedAt
```

#### 4. ShiftAssignments
Maps workers to shifts on specific dates.

```
shiftAssignments
├── id (PK, auto-increment)
├── workerId (FK → workers.id)
├── shiftId (FK → shifts.id)
├── assignmentDate (date)
├── status (enum: scheduled, completed, absent, cancelled)
├── createdAt
├── updatedAt
└── deletedAt
```

#### 5. Tasks
Shift-based task definitions.

```
tasks
├── id (PK, auto-increment)
├── shiftId (FK → shifts.id)
├── title (text, e.g., "Check Water Chiller")
├── description (text)
├── dueTime (time, e.g., 09:00)
├── frequency (enum: once, every_2h, every_4h, daily)
├── priority (enum: low, medium, high, critical)
├── machineId (FK → machines.id, nullable)
├── isActive (boolean)
├── createdAt
├── updatedAt
└── deletedAt
```

#### 6. TaskCompletions
Logs each task completion by workers.

```
taskCompletions
├── id (PK, auto-increment)
├── taskId (FK → tasks.id)
├── shiftAssignmentId (FK → shiftAssignments.id)
├── workerId (FK → workers.id)
├── completedAt (timestamp)
├── status (enum: completed, skipped, pending)
├── notes (text, optional)
├── createdAt
└── updatedAt
```

#### 7. Machines
Factory equipment and machinery registry.

```
machines
├── id (PK, auto-increment)
├── name (text, e.g., "Water Chiller Unit 1")
├── code (unique, e.g., "MC-001")
├── type (text, e.g., "Chiller", "Cooling Tower", "Pump")
├── location (text)
├── status (enum: operational, maintenance, offline)
├── lastMaintenanceDate (date)
├── nextMaintenanceDate (date)
├── criticalityLevel (enum: low, medium, high, critical)
├── createdAt
├── updatedAt
└── deletedAt
```

#### 8. MachineStatusLogs
Tracks machine status changes and monitoring.

```
machineStatusLogs
├── id (PK, auto-increment)
├── machineId (FK → machines.id)
├── status (enum: operational, maintenance, offline)
├── loggedBy (FK → workers.id)
├── notes (text)
├── parameters (JSON, e.g., {"temperature": 25, "waterLevel": 80})
├── createdAt
└── updatedAt
```

#### 9. MaintenanceActions
Records maintenance work performed on machines.

```
maintenanceActions
├── id (PK, auto-increment)
├── machineId (FK → machines.id)
├── actionType (enum: inspection, repair, replacement, cleaning)
├── description (text)
├── performedBy (FK → workers.id)
├── startTime (timestamp)
├── endTime (timestamp)
├── notes (text)
├── createdAt
└── updatedAt
```

#### 10. WorkerKPIs
Supervisor ratings and performance scores per shift.

```
workerKPIs
├── id (PK, auto-increment)
├── workerId (FK → workers.id)
├── shiftAssignmentId (FK → shiftAssignments.id)
├── ratedBy (FK → workers.id, supervisor)
├── punctualityScore (int, 1-5)
├── taskCompletionScore (int, 1-5)
├── behaviorScore (int, 1-5)
├── overallScore (int, 1-5, calculated average)
├── comments (text)
├── ratedAt (timestamp)
├── createdAt
└── updatedAt
```

#### 11. NegligenceStrikes
Automatic strike logging for negligence.

```
negligenceStrikes
├── id (PK, auto-increment)
├── workerId (FK → workers.id)
├── shiftAssignmentId (FK → shiftAssignments.id)
├── strikeType (enum: missed_task, machine_unattended, late_arrival, unauthorized_absence)
├── description (text)
├── severity (enum: warning, strike, critical)
├── escalationLevel (int, 0-3)
├── resolvedAt (timestamp, nullable)
├── resolvedBy (FK → workers.id, nullable)
├── resolutionNotes (text)
├── createdAt
└── updatedAt
```

#### 12. Issues
Factory floor issue reporting and tracking.

```
issues
├── id (PK, auto-increment)
├── reportedBy (FK → workers.id)
├── title (text)
├── description (text)
├── severity (enum: low, medium, high, critical)
├── category (enum: safety, equipment, quality, other)
├── machineId (FK → machines.id, nullable)
├── status (enum: open, in_progress, resolved, closed)
├── assignedTo (FK → workers.id, nullable)
├── resolutionNotes (text)
├── resolvedAt (timestamp, nullable)
├── createdAt
├── updatedAt
└── deletedAt
```

#### 13. AttendanceLogs
QR code check-in and check-out records.

```
attendanceLogs
├── id (PK, auto-increment)
├── workerId (FK → workers.id)
├── shiftAssignmentId (FK → shiftAssignments.id)
├── checkInTime (timestamp)
├── checkOutTime (timestamp, nullable)
├── checkInLocation (text, optional)
├── checkOutLocation (text, optional)
├── createdAt
└── updatedAt
```

#### 14. LoyverseSync
Tracks Loyverse API data synchronization.

```
loyverseSync
├── id (PK, auto-increment)
├── syncDate (date)
├── totalSales (decimal)
├── totalUnits (int)
├── stockOutEvents (int)
├── syncStatus (enum: pending, completed, failed)
├── errorMessage (text, nullable)
├── createdAt
└── updatedAt
```

#### 15. DailyReports
Auto-generated daily operation summaries.

```
dailyReports
├── id (PK, auto-increment)
├── reportDate (date)
├── shiftId (FK → shifts.id)
├── totalWorkersScheduled (int)
├── totalWorkersPresent (int)
├── totalTasksAssigned (int)
├── totalTasksCompleted (int)
├── machineIssuesCount (int)
├── strikeCount (int)
├── averageKPIScore (decimal)
├── loyverseData (JSON)
├── reportContent (longtext, markdown/HTML)
├── generatedAt (timestamp)
├── createdAt
└── updatedAt
```

#### 16. WeeklyReports
Auto-generated weekly accountability summaries.

```
weeklyReports
├── id (PK, auto-increment)
├── weekStartDate (date)
├── weekEndDate (date)
├── totalWorkersActive (int)
├── totalShiftsCompleted (int)
├── totalStrikesIssued (int)
├── averageKPIScore (decimal)
├── topPerformers (JSON, array of worker IDs)
├── underperformers (JSON, array of worker IDs)
├── machineDowntimeHours (decimal)
├── reportContent (longtext, markdown/HTML)
├── generatedAt (timestamp)
├── createdAt
└── updatedAt
```

## API Routes Overview

### Worker Management Routes
- `POST /api/trpc/workers.create` - Create new worker
- `GET /api/trpc/workers.list` - List all workers with pagination
- `GET /api/trpc/workers.getById` - Get worker details
- `PUT /api/trpc/workers.update` - Update worker profile
- `DELETE /api/trpc/workers.delete` - Soft delete worker
- `GET /api/trpc/workers.getQRCode` - Get worker QR code

### Shift Management Routes
- `POST /api/trpc/shifts.create` - Create shift definition
- `GET /api/trpc/shifts.list` - List all shifts
- `PUT /api/trpc/shifts.update` - Update shift
- `POST /api/trpc/shiftAssignments.assign` - Assign worker to shift
- `GET /api/trpc/shiftAssignments.getByDate` - Get assignments for date
- `PUT /api/trpc/shiftAssignments.updateStatus` - Update assignment status

### Task Management Routes
- `POST /api/trpc/tasks.create` - Create task for shift
- `GET /api/trpc/tasks.getByShift` - Get tasks for shift
- `POST /api/trpc/taskCompletions.complete` - Mark task as complete
- `GET /api/trpc/taskCompletions.getByShiftAssignment` - Get completions for assignment
- `GET /api/trpc/taskCompletions.getHistory` - Get worker task history

### Machine Management Routes
- `POST /api/trpc/machines.create` - Register new machine
- `GET /api/trpc/machines.list` - List all machines
- `PUT /api/trpc/machines.updateStatus` - Update machine status
- `POST /api/trpc/machineStatusLogs.log` - Log machine status check
- `GET /api/trpc/machineStatusLogs.getRecent` - Get recent status logs
- `POST /api/trpc/maintenanceActions.log` - Log maintenance action
- `GET /api/trpc/maintenanceActions.getHistory` - Get machine maintenance history

### KPI & Performance Routes
- `POST /api/trpc/workerKPIs.rate` - Rate worker performance
- `GET /api/trpc/workerKPIs.getByWorker` - Get worker KPI history
- `GET /api/trpc/workerKPIs.getStats` - Get KPI statistics

### Strike System Routes
- `POST /api/trpc/negligenceStrikes.log` - Log negligence strike (auto or manual)
- `GET /api/trpc/negligenceStrikes.getByWorker` - Get worker strike history
- `PUT /api/trpc/negligenceStrikes.resolve` - Resolve strike
- `GET /api/trpc/negligenceStrikes.getActive` - Get active strikes

### Issue Log Routes
- `POST /api/trpc/issues.create` - Report new issue
- `GET /api/trpc/issues.list` - List issues with filtering
- `PUT /api/trpc/issues.updateStatus` - Update issue status
- `PUT /api/trpc/issues.resolve` - Resolve issue
- `GET /api/trpc/issues.getByMachine` - Get issues for machine

### Attendance Routes
- `POST /api/trpc/attendance.checkIn` - QR check-in
- `POST /api/trpc/attendance.checkOut` - QR check-out
- `GET /api/trpc/attendance.getByWorker` - Get attendance history
- `GET /api/trpc/attendance.getTodayStatus` - Get today's attendance status

### Loyverse Integration Routes
- `POST /api/trpc/loyverse.syncSalesData` - Sync sales from Loyverse
- `GET /api/trpc/loyverse.getLatestSync` - Get latest sync data
- `GET /api/trpc/loyverse.getCorrelation` - Get yield vs labor correlation

### Report Generation Routes
- `POST /api/trpc/reports.generateDaily` - Generate daily report
- `GET /api/trpc/reports.getDailyReport` - Get daily report
- `POST /api/trpc/reports.generateWeekly` - Generate weekly report
- `GET /api/trpc/reports.getWeeklyReport` - Get weekly report
- `GET /api/trpc/reports.exportPDF` - Export report as PDF

## Key Design Principles

1. **Role-Based Access Control**: All procedures use `protectedProcedure` with role checks via `ctx.user.role`
2. **Automatic Strike Triggering**: System logic in procedures detects negligence conditions and auto-logs strikes
3. **Timestamp Precision**: All timestamps stored as UTC Unix milliseconds for consistency
4. **Soft Deletes**: Workers, machines, and issues use soft deletes to preserve historical data
5. **JSON Flexibility**: Complex data (parameters, sync data, report content) stored as JSON for flexibility
6. **Audit Trail**: All critical actions logged with timestamps and user attribution
7. **Loyverse Sync**: Daily scheduled sync via heartbeat to keep production data current

## Integration Points

### Loyverse API
- Daily sync of sales transactions and inventory levels
- Mapping shift workers to production yield
- Correlation analysis for performance metrics

### QR Code Generation
- Unique per worker, stored as UUID
- Generated on-demand and displayed as QR image
- Scanned at check-in/check-out to log attendance

### PDF Report Generation
- Uses existing template libraries (fpdf2, reportlab)
- Daily reports: shift summary, KPI scores, machine status, issues
- Weekly reports: accountability summary, top/underperformers, downtime analysis
