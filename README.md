# redcode

**Global one-command installer** for the RedCode setup:

- `AGENTS.md` — the full RedCode operating spec
- `roshan-profile.md` — the operator profile (Roshan Kumar / Rishi)
- **17 skills** — `redcode-*` as real Agent Skills (incl. astrology + palmistry)

It **auto-detects the AI coding agents on your machine** and installs into each one's own config path — the same way skills install: drop the files where the agent looks for them, and patch a config pointer only for the few agents that require one.

## Install (any machine)

```bash
npm install -g redcode
```

(Or locally: `npm install -g /root/hacking/redcode-setup`)

## Usage

```bash
redcode                 # install into every detected agent (default)
redcode agents          # list all 31 supported agents + detection state
redcode status          # per-agent install state
redcode update          # re-copy everything
redcode uninstall --yes # remove installed copies (only template-matching files)
```

### Agent selection

```bash
redcode --agent opencode          # only OpenCode
redcode --agent claude            # only Claude Code
redcode --agent codex             # only Codex CLI
redcode --agent junie             # only Junie
redcode --universal               # also install shared ~/.agents/AGENTS.md + skills
redcode --agent-path ~/my-setup   # custom target root
redcode --all                     # skip the prompt, install to all detected
```

If several agents are detected, it asks which one(s) to install into — or just add `--all`.

`--universal` writes `~/.agents/AGENTS.md` (spec + profile merged) and all 17 skills to `~/.agents/skills/` — the de-facto cross-tool shared location read by many agents (Qwen, Kimi, Cline, Droid, Vibe, Kilo, Roo, Pi, OpenHands, Open Interpreter, Devin, Junie, …).

## Supported agents (31)

| Agent | `--agent` id | Spec / instructions | Profile | Skills |
|---|---|---|---|---|
| OpenCode | `opencode` | `~/.config/opencode/AGENTS.md` | `~/.config/opencode/agents/roshan-profile.md` | `~/.config/opencode/skills/` |
| Claude Code | `claude` | `~/.claude/CLAUDE.md` | `~/.claude/ROSHAN.md` | `~/.claude/skills/` |
| Codex CLI | `codex` | `~/.codex/AGENTS.md` | `~/.codex/ROSHAN.md` | `~/.agents/skills/` |
| Antigravity CLI | `antigravity` | `~/.gemini/AGENTS.md` + `~/.gemini/GEMINI.md` | `~/.gemini/ROSHAN.md` | `~/.gemini/skills/`, `~/.gemini/antigravity-cli/skills/` |
| Gemini CLI | `gemini` | `~/.gemini/GEMINI.md` | `~/.gemini/ROSHAN.md` | `~/.gemini/skills/` |
| GitHub Copilot CLI | `copilot` | `~/.copilot/copilot-instructions.md` | `~/.copilot/ROSHAN.md` | `~/.copilot/skills/` |
| Cursor CLI | `cursor` | `~/.cursor/rules/redcode.mdc` (alwaysApply) | `~/.cursor/rules/redcode-profile.mdc` | `~/.cursor/skills/`, `~/.agents/skills/` |
| Aider | `aider` | `~/.config/aider/AGENTS.md` (+ `read:` entries auto-added to `~/.aider.conf.yml`) | `~/.config/aider/ROSHAN.md` | — |
| Goose | `goose` | `~/.config/goose/.goosehints` (merged) | merged into hints | `~/.agents/skills/` |
| Amp CLI | `amp` | `~/.config/amp/AGENTS.md` | `~/.config/amp/ROSHAN.md` | `~/.config/agents/skills/` |
| Kiro CLI | `kiro` | `~/.kiro/steering/AGENTS.md` | `~/.kiro/steering/ROSHAN.md` | `~/.kiro/skills/` |
| Qwen Code | `qwen` | `~/.qwen/QWEN.md` + `~/.qwen/AGENTS.md` | `~/.qwen/ROSHAN.md` | `~/.qwen/skills/`, `~/.agents/skills/` |
| Kimi Code CLI | `kimi` | `~/.kimi-code/AGENTS.md` | `~/.kimi-code/ROSHAN.md` | `~/.kimi-code/skills/`, `~/.agents/skills/` |
| Cline | `cline` | `~/Documents/Cline/Rules/redcode.md` (or `~/.cline/rules/`) | `redcode-profile.md` | `~/.cline/skills/`, `~/.agents/skills/` |
| Crush | `crush` | `~/.config/crush/CRUSH.md` | `~/.config/crush/ROSHAN.md` | `~/.config/crush/skills/` |
| Mistral Vibe | `vibe` | `~/.vibe/AGENTS.md` | `~/.vibe/ROSHAN.md` | `~/.vibe/skills/`, `~/.agents/skills/` |
| Factory Droid | `droid` | `~/.factory/AGENTS.md` | `~/.factory/ROSHAN.md` | `~/.factory/skills/`, `~/.agents/skills/` |
| Hermes Agent | `hermes` | `~/.hermes/SOUL.md` (+ `coding_instructions` auto-added to `config.yaml`) | merged into `coding_instructions` | `~/.hermes/skills/` |
| Pi Coding Agent | `pi` | `~/.pi/agent/AGENTS.md` (merged) | merged into AGENTS.md | `~/.pi/agent/skills/` |
| OpenHands | `openhands` | `~/.openhands/AGENTS.md` (informational; OpenHands reads repo-root files) | `~/.openhands/ROSHAN.md` | `~/.openhands/skills/`, `~/.agents/skills/` |
| Kilo Code | `kilo` | `~/.config/kilo/AGENTS.md` | `~/.config/kilo/ROSHAN.md` | `~/.kilo/skills/`, `~/.agents/skills/` |
| Roo Code | `roo` | `~/.roo/rules/redcode.md` | `~/.roo/rules/redcode-profile.md` | `~/.roo/skills/`, `~/.agents/skills/` |
| Continue | `continue` | `~/.continue/AGENTS.md` + `rules:` refs auto-added to `~/.continue/config.yaml` | `~/.continue/ROSHAN.md` | — |
| Amazon Q Developer | `amazon-q` | `~/.aws/amazonq/rules/redcode.md` | `redcode-profile.md` | — |
| Open Interpreter | `open-interpreter` | `~/.openinterpreter/AGENTS.md` | `~/.openinterpreter/ROSHAN.md` | `~/.agents/skills/` |
| SWE-agent | `swe-agent` | (config-driven via `--config` YAML; no global file exists) | — | — |
| Devin CLI | `devin` | `~/.config/devin/AGENTS.md` | `~/.config/devin/ROSHAN.md` | `~/.config/devin/skills/`, `~/.agents/skills/` |
| Jules | `jules` | (cloud agent; repo-root `AGENTS.md` only) | — | — |
| Junie | `junie` | `~/.junie/AGENTS.md` | `~/.junie/ROSHAN.md` | `~/.junie/skills/`, `~/.agents/skills/` |
| Windsurf / Devin Desktop | `windsurf` | `~/.devin/global_rules.md` + `~/.devin/rules/redcode.md` (+ legacy `~/.codeium/windsurf/memories/global_rules.md`) | `~/.devin/rules/redcode-profile.md` | `~/.config/devin/skills/`, `~/.codeium/windsurf/skills/` |
| OpenClaw | `openclaw` | `~/.openclaw/workspace/AGENTS.md` | `~/.openclaw/workspace/SOUL.md` | `~/.openclaw/skills/` |

Notes:

- Only **Codex** (`model_instructions_file`), **Aider** (`read:`), **Hermes** (`coding_instructions`) and **Continue** (`rules:`) need a config pointer; everything else auto-reads a fixed filename.
- **SWE-agent** and **Jules** run config-driven / cloud-only — there is no global instruction file; the installer reports them but has nothing to drop.
- `~/.agents/skills/` is the shared cross-tool skills location; an entry here covers several agents at once (also installable on its own with `--universal`).

## Options

| Flag | Meaning |
|---|---|
| `--agent <id>` | Only install into that agent (any id from the table) |
| `--agent-path <dir>` | Custom target root for the selected agent |
| `--universal` | Also install shared `~/.agents/AGENTS.md` + skills |
| `--all` | Install into all detected agents without prompting |
| `--dry-run` | Preview what would happen, write nothing |
| `--force` | Overwrite without backups |
| `--no-backup` | Never create backups |
| `--home <dir>` | Use a custom home directory (testing) |
| `--quiet` | Print only errors |
| `--yes` | Confirm destructive commands |

## Safety

- Existing files are backed up as `<name>.bak-<timestamp>` before being overwritten (unless `--force` / `--no-backup`)
- Config patches (`config.toml`, `~/.aider.conf.yml`, `~/.hermes/config.yaml`, `~/.continue/config.yaml`) are marked with `# added by redcode` / `# === redcode ===` and are idempotent — re-running never duplicates them
- `uninstall` only removes files that exactly match the templates — modified files are left alone
- Zero dependencies; pure Node ≥ 18

## Package

```bash
npm pack   # → redcode-2.0.0.tgz
npm install -g ./redcode-2.0.0.tgz
```
