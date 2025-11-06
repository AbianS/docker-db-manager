# Terminal/Command Execution - Analysis & Questions

## 📋 Current State Analysis

### **What Exists:**
1. ✅ **TerminalTab component** - Empty placeholder at `src/pages/edit-container/components/TerminalTab.tsx`
2. ✅ **Tab only visible when running** - Already configured with `requiresRunning: true`
3. ✅ **Docker service infrastructure** - `src-tauri/src/services/docker.rs` with:
   - Shell command execution patterns
   - PATH enrichment for macOS/Linux/Windows
   - Docker command wrapper methods
4. ✅ **Similar pattern in logs** - `get_container_logs` command shows how to execute `docker logs`
5. ✅ **Fixed window size** - 600x500px non-resizable

### **What's Missing:**
1. ❌ Backend Tauri command to execute commands in container
2. ❌ Frontend hook to manage command execution
3. ❌ UI for terminal input/output
4. ❌ Command history management
5. ❌ State management for terminal session

---

## 🔍 Technical Architecture Options

### **Backend - Docker Command Execution**

Docker provides: `docker exec [OPTIONS] CONTAINER COMMAND [ARG...]`

**Example:**
```bash
docker exec -it container_id bash
docker exec container_id ls -la
docker exec container_id psql -U postgres -c "SELECT version();"
```

**Two Approaches:**

#### **Option A: Single Command Execution (Simpler)**
- Execute one command at a time
- No persistent shell session
- Each command is isolated
- Pattern: `docker exec <container> <command>`

```rust
// Backend
pub async fn execute_container_command(
    app: &AppHandle,
    container_id: &str,
    command: &str,
) -> Result<String, String>
```

**Pros:**
- ✅ Simple to implement
- ✅ No session management needed
- ✅ Clean state (each command fresh)
- ✅ Easy error handling

**Cons:**
- ❌ No cd/environment persistence
- ❌ Each command starts fresh
- ❌ Can't chain commands with pipes/&&
- ❌ No interactive programs (top, vim)

#### **Option B: Interactive Shell Session (Complex)**
- Persistent shell session (bash/sh)
- Maintain state between commands
- Pattern: Start shell, send stdin, read stdout

**Pros:**
- ✅ cd commands persist
- ✅ Environment variables persist
- ✅ Can use pipes, &&, ||
- ✅ More "terminal-like" experience

**Cons:**
- ❌ Complex state management
- ❌ Need to handle stdin/stdout streams
- ❌ Session cleanup on tab close
- ❌ More error-prone

---

## 🎨 Frontend UI Design Options

### **Option 1: Simple Command Input + Output Box**
```
┌─────────────────────────────────────┐
│ Previous commands & outputs         │
│ $ ls                                │
│ file1.txt file2.txt                 │
│ $ pwd                               │
│ /app                                │
│                                     │
│                                     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ > [Type command here___________] [▶]│
└─────────────────────────────────────┘
```

**Pros:**
- ✅ Simple to implement
- ✅ Fits 600x500px well
- ✅ Easy state management
- ✅ Works with single command execution

**Cons:**
- ❌ Less "terminal" feel
- ❌ No syntax highlighting
- ❌ Manual scroll management

### **Option 2: Terminal Library (xterm.js)**
Use a real terminal emulator library.

**Pros:**
- ✅ Professional terminal look
- ✅ Copy/paste support
- ✅ ANSI color codes
- ✅ Terminal-like UX

**Cons:**
- ❌ New dependency (xterm.js)
- ❌ More complex integration
- ❌ Overkill for simple commands?
- ❌ Need to handle terminal sizing

### **Option 3: Hybrid - Input field + Styled Output**
Input box at bottom, styled output above (terminal colors, monospace).

**Pros:**
- ✅ No new dependencies
- ✅ Terminal aesthetic
- ✅ Easy to implement
- ✅ Good for 600x500px

**Cons:**
- ❌ Not a "real" terminal
- ❌ Limited terminal features

---

## 🤔 Key Questions

### **Q1: Execution Model**
**Which approach do you prefer?**
- **A)** Single command execution (like running `docker exec` once per command)
  - Simpler, each command isolated
  - No cd/environment persistence
- **B)** Persistent shell session
  - More complex, but cd/env persists
  - Closer to real terminal experience

### **Q2: UI Design**
**What kind of interface do you want?**
- **A)** Simple: Input box + scrollable output area (no dependencies)
- **B)** Terminal library (xterm.js - professional terminal emulator)
- **C)** Hybrid: Styled output with terminal colors but simpler UI

### **Q3: Command History**
**Should we store command history?**
- **A)** Yes, arrow up/down to navigate previous commands
- **B)** No, keep it simple for now
- **C)** Yes, but only in-memory (lost on tab close)

### **Q4: Output Handling**
**How should output be displayed?**
- **A)** Plain text (simple)
- **B)** ANSI color codes rendered (like real terminal)
- **C)** Plain text but with basic syntax highlighting

### **Q5: Command Validation**
**Should we validate/restrict commands?**
- **A)** Allow any command (full freedom)
- **B)** Block dangerous commands (rm -rf, etc.)
- **C)** Provide command suggestions for common tasks

### **Q6: Error Handling**
**When a command fails (non-zero exit code)?**
- **A)** Show stderr in red/highlighted
- **B)** Show toast notification
- **C)** Both (stderr + toast)
- **D)** Just show stderr inline

### **Q7: Database-Specific Commands**
**Should we provide shortcuts for common DB commands?**
For example:
- PostgreSQL: Quick buttons for `psql -U user`
- MySQL: Quick button for `mysql -u user`
- Or just let user type everything?

### **Q8: Multi-line Commands**
**Should we support multi-line input?**
- **A)** Yes, Shift+Enter for new line, Enter to execute
- **B)** No, single line only
- **C)** Later, start with single line

### **Q9: Output Limit**
**How much output to keep in memory?**
- **A)** Similar to logs: 5000 lines, FIFO
- **B)** Unlimited (until tab close)
- **C)** Different limit (specify)

### **Q10: Auto-scroll**
**Should output auto-scroll to bottom?**
- **A)** Yes, always
- **B)** Yes, but disable if user scrolls up (like logs tab)
- **C)** No, manual scroll only

---

## 🏗️ Proposed Architecture (Pending Your Answers)

### **Backend (Rust/Tauri):**
```
src-tauri/src/services/docker.rs
  └─ execute_container_command() // New method

src-tauri/src/commands/docker.rs
  └─ execute_container_command  // New Tauri command
```

### **Frontend (React/TypeScript):**
```
src/pages/edit-container/hooks/
  └─ use-container-terminal.ts  // New hook

src/pages/edit-container/components/
  └─ TerminalTab.tsx             // Implement UI
```

### **Data Flow:**
```
User types command
  ↓
Frontend hook validates/formats
  ↓
invoke('execute_container_command', { containerId, command })
  ↓
Rust executes: docker exec <container> <command>
  ↓
Returns { stdout, stderr, exitCode }
  ↓
Frontend displays output
  ↓
Command added to history
```

---

## 📦 Potential Dependencies

### **If we go with Terminal Library:**
- `xterm` - Terminal emulator
- `xterm-addon-fit` - Auto-resize terminal
- `xterm-addon-web-links` - Clickable links

### **If we go Simple:**
- None! Just existing React + Tailwind

---

## ⚠️ Constraints & Considerations

1. **Window Size:** 600x500px fixed
   - Need to fit input + output comfortably
   - Consider toolbar/header space already used

2. **Container Must Be Running:**
   - Already handled by tab visibility
   - But should validate before sending command

3. **Different Database Types:**
   - PostgreSQL, MySQL, MongoDB, Redis
   - Each has different default shells
   - Each has different CLIs

4. **Error Cases:**
   - Container stopped mid-command
   - Docker daemon down
   - Command timeout (long-running commands)
   - Permission errors

5. **Performance:**
   - Don't block UI during command execution
   - Consider command timeout (30s? 60s?)
   - Streaming output vs. waiting for completion

---

## 🎯 Recommended Starting Point (My Opinion)

Based on simplicity and your existing patterns:

1. **Execution:** Single command (Option A)
2. **UI:** Hybrid styled output (Option 3)
3. **History:** In-memory only (Option C)
4. **Output:** Plain text with stderr in red (Option A)
5. **Validation:** Allow all commands (Option A) - with warning
6. **Errors:** Show stderr inline in red (Option A)
7. **DB Commands:** Manual typing (no shortcuts yet)
8. **Multi-line:** Single line only (Option B)
9. **Output Limit:** 5000 lines FIFO (Option A)
10. **Auto-scroll:** Like logs - auto but disable on scroll (Option B)

This gives you a functional terminal quickly, and we can enhance later.

---

## ❓ Next Steps

Please answer the 10 questions above so I can create a precise implementation plan! 🚀
