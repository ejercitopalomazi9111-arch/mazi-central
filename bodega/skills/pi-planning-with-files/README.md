# planning-with-files

> **Your agent's context window dies. The plan does not.**

Persistent file-based planning for AI coding agents. The skill keeps `task_plan.md`, `findings.md` and `progress.md` on disk and re-injects them every turn, so the plan survives context loss, `/clear`, crashes and compaction. Manus-style working memory on disk, with an opt-in completion gate.

This is the npm distribution of [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files), which installs across 60+ agents via the Agent Skills standard. The package ships:

- the planning skill itself: `SKILL.md`, `scripts/` and `templates/`
- a [Pi Coding Agent](https://pi.dev) extension providing Claude-style lifecycle automation

## Installation

### npm

```bash
npm install planning-with-files
```

Places the skill, scripts and templates under `node_modules/planning-with-files/`. Use this to pin an exact version into a project, or to copy `SKILL.md` and `scripts/` into your agent's skills directory yourself. It does not register hooks on its own.

### Pi Install

```bash
pi install npm:planning-with-files
```

Wires up the skill, the extension and the status bar automatically.

### Other agents

Claude Code gets the full surface (skill, hooks, slash commands) through the plugin route, and 60+ other agents install in one line. See the [main README](https://github.com/OthmanAdi/planning-with-files#quick-install).

### Manual Install

```bash
# From the planning-with-files repo root
pi install ./.pi/skills/planning-with-files
```

Or add to `.pi/settings.json`:
```json
{
  "packages": ["./path/to/planning-with-files/.pi/skills/planning-with-files"]
}
```

---

## Usage

Pi discovers the skill and extension from the installed package.

Start with:

```text
Use the planning-with-files skill to help me with this task.
```

Or:

```text
/skill:planning-with-files
```

---

## Hook Parity in Pi

The bundled extension maps Claude-style behavior onto Pi events:

- `session_start` - session catchup
- passive plan status before approval
- `before_agent_start` - plan reminder/injection after `/plan-execute`
- `tool_call` - pre-tool recitation equivalent after `/plan-execute`
- `tool_result` - post-write reminder after `/plan-execute`
- `agent_end` - incomplete-task auto-continue after `/plan-execute` (limit 3)
- `session_before_compact` - pre-compaction reminder

Attestation is supported. If `task_plan.md` differs from approved hash, plan injection is blocked with:

```text
[planning-with-files] [PLAN TAMPERED - injection blocked]
```

---

## Mode System

`planningWithFiles.mode` supports:

- `auto` (default): DeepSeek -> `cache-safe`, others -> `parity`
- `parity`: full dynamic hook-equivalent behavior
- `cache-safe`: fixed reminder strings for KV-cache stability
- `notify`: notification-only mode

Configure via env:

```bash
PWF_MODE=cache-safe pi
```

Or settings:

```json
{
  "planningWithFiles": {
    "mode": "auto"
  }
}
```

---

## Commands

- `/plan-status`
- `/plan-attest [--show|--clear]`
- `/plan-execute`
- `/plan-execute reset`
- `/plan-goal <text|default|clear>`
- `/plan-loop [interval] [prompt]` (`stop` to cancel)

Draft and review `task_plan.md` first. The extension stays passive until you
approve the active plan with `/plan-execute`; after that, plan injection,
pre-tool reminders, post-write reminders, and auto-continue are enabled for the
current session and plan.

---

## Session Recovery

If needed, run catchup manually:

```bash
python3 .pi/skills/planning-with-files/scripts/session-catchup.py .
```

## File Structure

The skill workflow still centers on three files in your project:

```text
your-project/
├── task_plan.md
├── findings.md
└── progress.md
```
