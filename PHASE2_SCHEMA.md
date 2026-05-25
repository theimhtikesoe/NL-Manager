# Phase 2: Core Database Schema Update - Summary

## Database Schema Extensions

### 1. Factory Modes Table ✅
**Purpose:** Track global factory operational state (POWER_ON/POWER_OFF)

**Schema:**
```sql
CREATE TABLE factoryModes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  currentMode ENUM('POWER_ON', 'POWER_OFF') DEFAULT 'POWER_ON' NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id` - Primary key
- `currentMode` - Current factory state (POWER_ON = production, POWER_OFF = maintenance/cleaning)
- `updatedAt` - Last update timestamp
- `updatedBy` - Admin/supervisor who changed the mode
- `notes` - Reason for mode change
- `createdAt` - Creation timestamp

**Usage:**
- Frontend queries this to determine which tasks to display
- Supervisors toggle this via admin dashboard
- All task scheduling respects this mode

---

### 2. Worker Activity Logs Table ✅
**Purpose:** Track worker breaks, lunch, and car loading activities for accountability

**Schema:**
```sql
CREATE TABLE workerActivityLogs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  workerId INT NOT NULL,
  activityType ENUM('LUNCH', 'GENERAL_BREAK', 'CAR_LOADING') NOT NULL,
  startTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  endTime TIMESTAMP NULL,
  durationMinutes INT,
  complianceStatus ENUM('WITHIN_LIMIT', 'OVERTIME', 'PENDING') DEFAULT 'PENDING' NOT NULL,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_workerId (workerId),
  INDEX idx_startTime (startTime)
);
```

**Fields:**
- `id` - Primary key
- `workerId` - Reference to worker
- `activityType` - Type of break (LUNCH = 20 min, GENERAL_BREAK = 15 min, CAR_LOADING = variable)
- `startTime` - When activity started
- `endTime` - When activity ended (NULL if ongoing)
- `durationMinutes` - Calculated duration
- `complianceStatus` - Whether within allowed time limits
- `notes` - Additional notes

**Activity Type Limits:**
| Type | Allowed Time | Alert Threshold |
|------|--------------|-----------------|
| LUNCH | 20 minutes | 25 minutes |
| GENERAL_BREAK | 15 minutes | 18 minutes |
| CAR_LOADING | Flexible | N/A |

**Usage:**
- Workers log breaks via mobile app
- System calculates compliance automatically
- Supervisors see alerts for overtime breaks
- Reports track time theft patterns

---

### 3. Tasks Extended Table ✅
**Purpose:** Enhanced task scheduling with frequency and factory mode triggers

**Schema:**
```sql
CREATE TABLE tasksExtended (
  id INT PRIMARY KEY AUTO_INCREMENT,
  taskName VARCHAR(200) NOT NULL,
  description TEXT,
  frequencyMinutes INT NOT NULL,
  triggerMode ENUM('POWER_ON', 'POWER_OFF', 'ANY') DEFAULT 'ANY' NOT NULL,
  machineId INT,
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium' NOT NULL,
  isActive BOOLEAN DEFAULT TRUE NOT NULL,
  lastCompletedAt TIMESTAMP NULL,
  nextDueAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP NULL,
  INDEX idx_machineId (machineId),
  INDEX idx_triggerMode (triggerMode),
  INDEX idx_nextDueAt (nextDueAt)
);
```

**Fields:**
- `id` - Primary key
- `taskName` - Task description (e.g., "Tube Machine Refill - White")
- `description` - Detailed instructions
- `frequencyMinutes` - How often task repeats (30, 40, 1440 for daily, 10080 for weekly)
- `triggerMode` - When task is active (POWER_ON = production, POWER_OFF = maintenance, ANY = always)
- `machineId` - Associated machine
- `priority` - Task priority level
- `isActive` - Whether task is enabled
- `lastCompletedAt` - When task was last completed
- `nextDueAt` - When task is next due
- `createdAt` - Creation timestamp
- `updatedAt` - Last update
- `deletedAt` - Soft delete timestamp

**Example Tasks:**
| Task Name | Frequency | Trigger | Machine |
|-----------|-----------|---------|---------|
| Tube Machine Refill - White | 30 min | POWER_ON | Tube |
| Cooler Water Check | 1440 min (daily) | POWER_ON | Cooler |
| Equipment Cleaning | 10080 min (weekly) | POWER_OFF | Any |
| Bottle Machine Refill | 40 min | POWER_ON | Bottle |

**Usage:**
- Dynamically show/hide tasks based on factory mode
- Calculate next due time automatically
- Track task completion for accountability
- Alert supervisors on missed tasks

---

## Database Helper Functions

### File: `server/db.factory.ts`

#### Factory Mode Functions
```typescript
// Get current factory mode
getCurrentFactoryMode(): Promise<FactoryMode | null>

// Update factory mode (admin only)
updateFactoryMode(
  newMode: "POWER_ON" | "POWER_OFF",
  updatedBy: number,
  notes?: string
): Promise<FactoryMode | null>
```

#### Worker Activity Functions
```typescript
// Start a new activity
startWorkerActivity(
  workerId: number,
  activityType: "LUNCH" | "GENERAL_BREAK" | "CAR_LOADING"
): Promise<WorkerActivityLog | null>

// End an activity and calculate duration
endWorkerActivity(
  activityLogId: number,
  maxAllowedMinutes?: number
): Promise<WorkerActivityLog | null>

// Get ongoing activity for a worker
getActiveWorkerActivity(workerId: number): Promise<WorkerActivityLog | null>

// Get activity logs for date range
getWorkerActivityLogs(
  workerId: number,
  startDate: Date,
  endDate: Date
): Promise<WorkerActivityLog[]>

// Get overtime violations
getWorkerOvertimeViolations(
  workerId: number,
  startDate: Date,
  endDate: Date
): Promise<WorkerActivityLog[]>

// Get total break time for a day
getWorkerDailyBreakTime(workerId: number, date: Date): Promise<number>
```

---

## tRPC Router: Factory

### File: `server/routers/factory.ts`

#### Public Procedures
```typescript
// Get current factory mode (used by frontend for task filtering)
factory.getCurrentMode.query()
→ { mode: "POWER_ON" | "POWER_OFF", lastUpdated: Date, ... }
```

#### Protected Procedures (Authenticated Workers)
```typescript
// Start a break/lunch
factory.startActivity.mutation({ activityType, workerId })
→ { success: true, activityId, startTime }

// End a break/lunch
factory.endActivity.mutation({ activityLogId, maxAllowedMinutes })
→ { success: true, durationMinutes, complianceStatus }

// Check ongoing activity
factory.getActiveActivity.query({ workerId })
→ { id, activityType, elapsedMinutes, complianceStatus } | null
```

#### Admin Procedures (Supervisors Only)
```typescript
// Switch factory mode
factory.switchMode.mutation({ newMode, notes })
→ { success: true, mode, timestamp }

// Get activity logs
factory.getActivityLogs.query({ workerId, startDate, endDate })
→ WorkerActivityLog[]

// Get overtime violations
factory.getOvertimeViolations.query({ workerId, startDate, endDate })
→ { count, violations }

// Get daily break time
factory.getDailyBreakTime.query({ workerId, date })
→ { totalBreakMinutes, isOvertime }
```

---

## Migration Steps

### Step 1: Generate Drizzle Migration
```bash
pnpm db:push
```

This will:
1. Generate migration files in `drizzle/migrations/`
2. Create the new tables in your database
3. Add indexes for performance

### Step 2: Verify Schema
```bash
# Check if tables were created
mysql -u user -p database_name -e "SHOW TABLES LIKE '%factory%';"
mysql -u user -p database_name -e "SHOW TABLES LIKE '%workerActivity%';"
```

### Step 3: Test Procedures
```bash
# Start dev server
pnpm dev

# Test in browser console
await trpc.factory.getCurrentMode.query()
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  - Worker Mobile App (QR Scan, Break Management)            │
│  - Supervisor Dashboard (Factory State, Alerts)             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   tRPC Router (factory)                     │
│  - getCurrentMode (public)                                  │
│  - startActivity/endActivity (protected)                    │
│  - switchMode (admin)                                       │
│  - getActivityLogs/getOvertimeViolations (admin)            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Database Helper Functions                      │
│  - getCurrentFactoryMode()                                  │
│  - startWorkerActivity()                                    │
│  - endWorkerActivity()                                      │
│  - getWorkerActivityLogs()                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    MySQL Database                           │
│  - factoryModes table                                       │
│  - workerActivityLogs table                                 │
│  - tasksExtended table                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

- [ ] Migration runs successfully: `pnpm db:push`
- [ ] Tables created in database
- [ ] Indexes created for performance
- [ ] tRPC procedures accessible
- [ ] Factory mode query returns correct data
- [ ] Activity logging works (start/end)
- [ ] Compliance calculation correct
- [ ] Overtime detection working
- [ ] Admin procedures require authentication

---

## Next Steps (Phase 3)

With database schema and tRPC routers ready, we can now build:

1. **Worker Mobile UI**
   - QR code scanner integration
   - Break management buttons
   - Active task reminders
   - Real-time duration display

2. **Supervisor Dashboard**
   - Live factory state toggle
   - Worker attendance grid
   - Break time alerts
   - Machine status tracker

3. **Analytics & Reports**
   - Daily accountability reports
   - Overtime violation tracking
   - Worker efficiency metrics
   - PDF report generation
