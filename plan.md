# Terminal Command Execution - Implementation Plan

**Overall Progress:** `67%` (10/15 tasks completed)

---

## Task Breakdown

### **Phase 1: Backend - Rust/Tauri Command (Docker Exec)**

- [x] 🟩 **Step 1: Add execute_container_command method to DockerService**
  - [x] 🟩 Add method to `src-tauri/src/services/docker.rs`
  - [x] 🟩 Execute `docker exec <container_id> sh -c "<command>"`
  - [x] 🟩 Return struct with `stdout`, `stderr`, `exit_code`
  - [x] 🟩 Handle errors (container not found, docker daemon down, etc.)

- [x] 🟩 **Step 2: Create Tauri command wrapper**
  - [x] 🟩 Add command to `src-tauri/src/commands/docker.rs`
  - [x] 🟩 Define command signature: `execute_container_command(container_id: String, command: String)`
  - [x] 🟩 Return JSON: `{ stdout: String, stderr: String, exitCode: i32 }`

- [x] 🟩 **Step 3: Register command in Tauri**
  - [x] 🟩 Add to command list in `src-tauri/src/lib.rs`
  - [x] 🟩 Test command with `cargo build`

---

### **Phase 2: Frontend - Install & Setup xterm.js**

- [x] 🟩 **Step 4: Install xterm.js dependencies**
  - [x] 🟩 Run `npm install @xterm/xterm @xterm/addon-fit`
  - [x] 🟩 Types included in @xterm/xterm package
  - [x] 🟩 Verify package.json updated

- [x] 🟩 **Step 5: Create xterm.js CSS import**
  - [x] 🟩 Import xterm CSS in `src/main.tsx`
  - [x] 🟩 Add: `import '@xterm/xterm/css/xterm.css'`

---

### **Phase 3: Frontend - Terminal Hook**

- [x] 🟩 **Step 6: Create use-container-terminal hook**
  - [x] 🟩 Create file: `src/pages/edit-container/hooks/use-container-terminal.ts`
  - [x] 🟩 State: command history array, executing boolean
  - [x] 🟩 Function: `executeCommand(command: string)` - calls Tauri backend
  - [x] 🟩 Return: `{ executeCommand, isExecuting, history, clearHistory }`

---

### **Phase 4: Frontend - Terminal UI Component**

- [x] 🟩 **Step 7: Implement TerminalTab with xterm.js**
  - [x] 🟩 Update `src/pages/edit-container/components/TerminalTab.tsx`
  - [x] 🟩 Initialize xterm.js terminal instance with FitAddon
  - [x] 🟩 Set terminal theme (dark background, green text)
  - [x] 🟩 Mount terminal to DOM in useEffect

- [x] 🟩 **Step 8: Implement command input handling**
  - [x] 🟩 Listen to terminal `onData` event for user input
  - [x] 🟩 Build command string from input characters
  - [x] 🟩 Handle Enter key → execute command
  - [x] 🟩 Handle Backspace → remove last character
  - [x] 🟩 Display prompt: `$ ` or `container-name$ `

- [x] 🟩 **Step 9: Implement command execution & output**
  - [x] 🟩 Call `executeCommand` from hook when Enter pressed
  - [x] 🟩 Show loading indicator while executing
  - [x] 🟩 Write stdout to terminal in white/green
  - [x] 🟩 Write stderr to terminal in red (if any)
  - [x] 🟩 Display new prompt after command completes

- [x] 🟩 **Step 10: Handle terminal lifecycle**
  - [x] 🟩 Clear terminal on mount (optional welcome message)
  - [x] 🟩 Dispose terminal instance on unmount
  - [x] 🟩 Handle container stop → show error message
  - [x] 🟩 Fit terminal to container size on mount

---

### **Phase 5: Polish & Error Handling**

- [ ] 🟥 **Step 11: Add error handling**
  - [ ] 🟥 Handle backend errors (container stopped, docker down)
  - [ ] 🟥 Display error messages in terminal (red text)
  - [ ] 🟥 Validate container is running before executing
  - [ ] 🟥 Handle command timeout gracefully

- [ ] 🟥 **Step 12: Terminal styling & UX**
  - [ ] 🟥 Set terminal background to match theme (bg-card)
  - [ ] 🟥 Adjust terminal padding/margins
  - [ ] 🟥 Set terminal font (monospace, good size for 600x500px)
  - [ ] 🟥 Configure terminal cursor style

- [ ] 🟥 **Step 13: Prevent memory leaks**
  - [ ] 🟥 Limit command history to reasonable size (e.g., last 100 commands)
  - [ ] 🟥 Clear terminal buffer on tab switch (optional)
  - [ ] 🟥 Ensure xterm instance is properly disposed

---

### **Phase 6: Testing & Documentation**

- [ ] 🟥 **Step 14: Manual testing**
  - [ ] 🟥 Test basic commands: `ls`, `pwd`, `echo "hello"`
  - [ ] 🟥 Test commands with output: `cat file.txt`, `ps aux`
  - [ ] 🟥 Test commands with errors: `invalid-command`, `ls /nonexistent`
  - [ ] 🟥 Test with different database types (PostgreSQL, MySQL, Redis, MongoDB)
  - [ ] 🟥 Test container stop scenario while terminal open
  - [ ] 🟥 Test special characters and spaces in commands
  - [ ] 🟥 Test long-running commands behavior

- [ ] 🟥 **Step 15: Code cleanup & documentation**
  - [ ] 🟥 Add JSDoc comments to hook functions
  - [ ] 🟥 Add Rust doc comments to backend methods
  - [ ] 🟥 Clean up console.logs (or add proper logging)
  - [ ] 🟥 Update TERMINAL_ANALYSIS.md with implementation notes

---

## Implementation Details

### **Backend Structure**

**File:** `src-tauri/src/services/docker.rs`
```rust
pub async fn execute_container_command(
    &self,
    app: &AppHandle,
    container_id: &str,
    command: &str,
) -> Result<CommandOutput, String>
```

**Returns:**
```rust
struct CommandOutput {
    stdout: String,
    stderr: String,
    exit_code: i32,
}
```

**Docker Command:**
```bash
docker exec <container_id> sh -c "<command>"
```

---

### **Frontend Structure**

**Hook:** `use-container-terminal.ts`
```typescript
interface TerminalHistory {
  command: string;
  output: string;
  error: string | null;
  exitCode: number;
  timestamp: Date;
}

function useContainerTerminal(containerId?: string) {
  const [history, setHistory] = useState<TerminalHistory[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const executeCommand = async (command: string) => {
    // Call Tauri backend
    // Update history
  };
  
  return { executeCommand, isExecuting, history };
}
```

**Component:** `TerminalTab.tsx`
```typescript
function TerminalTab({ container }: TerminalTabProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const { executeCommand, isExecuting } = useContainerTerminal(container.containerId);
  
  // Initialize xterm
  // Handle input
  // Display output
}
```

---

### **xterm.js Configuration**

```typescript
const terminal = new Terminal({
  cursorBlink: true,
  cursorStyle: 'block',
  fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
  fontSize: 13,
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
  },
  rows: 20,
  cols: 80,
});
```

---

### **Data Flow**

```
User types in xterm.js
  ↓
onData event captures input
  ↓
Build command string
  ↓
Enter key pressed
  ↓
executeCommand(cmd) from hook
  ↓
invoke('execute_container_command', { containerId, command })
  ↓
Rust: docker exec container sh -c "command"
  ↓
Return { stdout, stderr, exitCode }
  ↓
Write output to xterm.js
  ↓
Display new prompt
```

---

### **Key Decisions**

✅ **Execution:** Single command (no persistent session)
✅ **UI:** xterm.js terminal library
✅ **History:** No history (keep simple)
✅ **Output:** ANSI colors via xterm.js
✅ **Validation:** Allow all commands
✅ **Errors:** Show stderr in red inline
✅ **DB Shortcuts:** No shortcuts (manual typing)
✅ **Multi-line:** Not for now (single line)
✅ **Output Limit:** Unlimited (xterm handles it)
✅ **Auto-scroll:** xterm.js default behavior

---

## Success Criteria

- ✅ User can type commands in terminal
- ✅ Commands execute in running container
- ✅ Output displays correctly in terminal
- ✅ Errors display in red
- ✅ Terminal has proper terminal look & feel
- ✅ No memory leaks
- ✅ Works across all database types
- ✅ Graceful error handling

---

## Notes

- xterm.js handles ANSI codes automatically
- xterm.js handles scrolling automatically
- No need for manual history management
- Single command execution is simpler and safer
- Focus on core functionality first, enhance later

---

## Implementation Status (Last Updated)

### ✅ Completed (Steps 1-10)
- **Backend (Rust)**: Full docker exec command implementation with error handling
- **Frontend Hook**: `use-container-terminal` with command history and execution logic
- **Terminal UI**: Full xterm.js integration with:
  - Terminal initialization with FitAddon
  - Dark theme matching application design
  - Command input handling (Enter, Backspace, Ctrl+C, Ctrl+L)
  - Command execution with stdout/stderr display
  - Proper lifecycle management (mount/unmount)
  - Welcome message and prompt display
  - Exit code handling

### 🔧 Bug Fixes Applied
1. **Input Blocking Issue**: Removed `isExecuting` check from `onData` handler - it was blocking user input prematurely
2. **Background Color**: Changed from hardcoded `#1e1e1e` to `transparent` to match LogsTab theme
3. **Font Family**: Changed to `ui-monospace, SFMono-Regular, ...` for better system font matching
4. **Syntax Error**: Fixed duplicate `terminal.onData()` call and `handleData` function reference
5. **Empty Command Output**: Added handling for commands that succeed with no output

### 🟨 Ready for Testing (Steps 11-13)
- Error handling implemented, needs testing
- Terminal styling matches theme
- Memory management in place (100 command history limit)

### 📋 Next Steps (Steps 14-15)
- Manual testing with different commands and databases
- Code cleanup and documentation updates

