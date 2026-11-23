#!/usr/bin/env node
/**
 * redcode — global installer for the RedCode operating spec, operator profile,
 * and all redcode-* skills. Auto-detects AI coding agents on the machine and
 * installs into each agent's own config paths, the same way skills install:
 * drop the files where the agent looks for them (and patch a config pointer
 * only for the few agents that require one).
 *
 * Works on any machine: npm install -g redcode
 *
 * Usage:
 *   redcode                          install into every detected agent (default)
 *   redcode install [opts]
 *   redcode status                   show per-agent install state
 *   redcode agents                   list all supported agents + detection state
 *   redcode update [opts]            re-copy everything (implies --force)
 *   redcode uninstall --yes          remove installed copies (only template-matching)
 *
 * Options:
 *   --agent <id>    only install into that agent (see `redcode agents`)
 *   --agent-path <dir>  custom target root for the selected agent
 *   --universal      also install the shared ~/.agents/AGENTS.md + skills (cross-tool)
 *   --all            install into all detected agents without prompting
 *   --dry-run        preview without writing
 *   --force          overwrite without backups
 *   --no-backup      never create backups
 *   --home <dir>     use <dir> as home (testing / custom HOME)
 *   --quiet          only print errors
 *   --yes            confirm destructive commands
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const readline = require('readline');
const { execSync } = require('child_process');

const PKG_ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(PKG_ROOT, 'package.json'));
const TEMPLATES = path.join(PKG_ROOT, 'templates');
const SPEC_SRC = path.join(TEMPLATES, 'AGENTS.md');
const PROFILE_SRC = path.join(TEMPLATES, 'roshan-profile.md');

// ---------------------------------------------------------------- helpers

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m',
  red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const log = (msg = '') => console.log(msg);
const info = (msg) => console.log(`${C.cyan}${msg}${C.reset}`);
const ok = (msg) => console.log(`  ${C.green}✓${C.reset} ${msg}`);
const warn = (msg) => console.log(`  ${C.yellow}!${C.reset} ${msg}`);
const err = (msg) => console.error(`  ${C.red}✗${C.reset} ${msg}`);

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function shaOf(txt) {
  return crypto.createHash('sha256').update(txt).digest('hex');
}

function hasBin(name) {
  if (!name) return false;
  try {
    execSync(`command -v ${JSON.stringify(name)}`, { stdio: 'ignore', shell: '/bin/sh' });
    return true;
  } catch { return false; }
}

function templateContent(src) {
  if (src === 'spec') return fs.readFileSync(SPEC_SRC, 'utf8');
  if (src === 'profile') return fs.readFileSync(PROFILE_SRC, 'utf8');
  if (src === 'merged') {
    return fs.readFileSync(SPEC_SRC, 'utf8') + '\n\n' + fs.readFileSync(PROFILE_SRC, 'utf8');
  }
  throw new Error(`unknown template src: ${src}`);
}

function collectSkills() {
  const skillsDir = path.join(TEMPLATES, 'skills');
  return fs.readdirSync(skillsDir)
    .filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory())
    .map((d) => ({ id: d, file: path.join(skillsDir, d, 'SKILL.md') }));
}

function homeDir(opts) {
  return opts.home || process.env.HOME || os.homedir();
}

function backup(target, opts) {
  if (opts.noBackup || opts.force) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bak = `${target}.bak-${stamp}`;
  fs.copyFileSync(target, bak);
  return bak;
}

// ---------------------------------------------------------------- agent registry

/**
 * Each agent defines:
 *  - id, label
 *  - bins: command names to check via `command -v`
 *  - detect(h): dir-or-bin check
 *  - dir(h): target root directory
 *  - files: [{ rel: [...], src: 'spec'|'profile'|'merged', wrap: 'mdc'|null }]
 *  - skills: [ (h) => absolute skills dir ]  ([] = agent has no skills dir)
 *  - patch(h, opts): optional config-pointer patch, returns string or null
 */
const AGENTS = [
  {
    id: 'opencode', label: 'OpenCode', bins: ['opencode'],
    detect: (h) => hasBin('opencode'),
    dir: (h) => path.join(h, '.config', 'opencode'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['agents', 'roshan-profile.md'], src: 'profile' },
    ],
    skills: [(h) => path.join(h, '.config', 'opencode', 'skills')],
    patch: null,
  },
  {
    id: 'claude', label: 'Claude Code', bins: ['claude'],
    detect: (h) => hasBin('claude'),
    dir: (h) => path.join(h, '.claude'),
    files: [
      { rel: ['CLAUDE.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [(h) => path.join(h, '.claude', 'skills')],
    patch: null,
  },
  {
    id: 'codex', label: 'Codex CLI', bins: ['codex'],
    detect: (h) => hasBin('codex'),
    dir: (h) => path.join(h, '.codex'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [(h) => path.join(h, '.agents', 'skills')],
    patch: null,
  },
  {
    id: 'antigravity', label: 'Antigravity CLI', bins: ['agy'],
    detect: (h) => hasBin('agy'),
    dir: (h) => path.join(h, '.gemini'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['GEMINI.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [
      (h) => path.join(h, '.gemini', 'skills'),
      (h) => path.join(h, '.gemini', 'antigravity-cli', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'gemini', label: 'Gemini CLI', bins: ['gemini'],
    detect: (h) => hasBin('gemini'),
    dir: (h) => path.join(h, '.gemini'),
    files: [
      { rel: ['GEMINI.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [(h) => path.join(h, '.gemini', 'skills')],
    patch: null,
  },
  {
    id: 'copilot', label: 'GitHub Copilot CLI', bins: ['copilot'],
    detect: (h) => hasBin('copilot'),
    dir: (h) => path.join(h, '.copilot'),
    files: [
      { rel: ['copilot-instructions.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [(h) => path.join(h, '.copilot', 'skills')],
    patch: null,
  },
  {
    id: 'cursor', label: 'Cursor CLI', bins: ['agent', 'cursor-agent'],
    detect: (h) => hasBin('agent') || hasBin('cursor-agent'),
    dir: (h) => path.join(h, '.cursor'),
    files: [
      { rel: ['rules', 'redcode.mdc'], src: 'spec', wrap: 'mdc' },
      { rel: ['rules', 'redcode-profile.mdc'], src: 'profile', wrap: 'mdc' },
    ],
    skills: [
      (h) => path.join(h, '.cursor', 'skills'),
      (h) => path.join(h, '.agents', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'aider', label: 'Aider', bins: ['aider'],
    detect: (h) => hasBin('aider'),
    dir: (h) => path.join(h, '.config', 'aider'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [],
    patch: patchAider,
  },
  {
    id: 'goose', label: 'Goose', bins: ['goose'],
    detect: (h) => hasBin('goose'),
    dir: (h) => path.join(h, '.config', 'goose'),
    files: [
      { rel: ['.goosehints'], src: 'merged' },
    ],
    skills: [(h) => path.join(h, '.agents', 'skills')],
    patch: null,
  },
  {
    id: 'amp', label: 'Amp CLI', bins: ['amp'],
    detect: (h) => hasBin('amp'),
    dir: (h) => path.join(h, '.config', 'amp'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [(h) => path.join(h, '.config', 'agents', 'skills')],
    patch: null,
  },
  {
    id: 'kiro', label: 'Kiro CLI', bins: ['kiro-cli'],
    detect: (h) => hasBin('kiro-cli'),
    dir: (h) => path.join(h, '.kiro'),
    files: [
      { rel: ['steering', 'AGENTS.md'], src: 'spec' },
      { rel: ['steering', 'ROSHAN.md'], src: 'profile' },
    ],
    skills: [(h) => path.join(h, '.kiro', 'skills')],
    patch: null,
  },
  {
    id: 'qwen', label: 'Qwen Code', bins: ['qwen'],
    detect: (h) => hasBin('qwen'),
    dir: (h) => path.join(h, '.qwen'),
    files: [
      { rel: ['QWEN.md'], src: 'spec' },
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [
      (h) => path.join(h, '.qwen', 'skills'),
      (h) => path.join(h, '.agents', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'kimi', label: 'Kimi Code CLI', bins: ['kimi'],
    detect: (h) => hasBin('kimi'),
    dir: (h) => path.join(h, '.kimi-code'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [
      (h) => path.join(h, '.kimi-code', 'skills'),
      (h) => path.join(h, '.agents', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'cline', label: 'Cline', bins: ['cline'],
    detect: (h) => hasBin('cline') || fs.existsSync(path.join(h, '.cline')),
    dir: (h) => {
      const docs = path.join(h, 'Documents', 'Cline', 'Rules');
      if (fs.existsSync(docs)) return docs;
      return path.join(h, '.cline', 'rules');
    },
    files: [
      { rel: ['redcode.md'], src: 'spec' },
      { rel: ['redcode-profile.md'], src: 'profile' },
    ],
    skills: [
      (h) => path.join(h, '.cline', 'skills'),
      (h) => path.join(h, '.agents', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'crush', label: 'Crush', bins: ['crush'],
    detect: (h) => hasBin('crush'),
    dir: (h) => path.join(h, '.config', 'crush'),
    files: [
      { rel: ['CRUSH.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [(h) => path.join(h, '.config', 'crush', 'skills')],
    patch: null,
  },
  {
    id: 'vibe', label: 'Mistral Vibe', bins: ['vibe'],
    detect: (h) => hasBin('vibe'),
    dir: (h) => path.join(h, '.vibe'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [
      (h) => path.join(h, '.vibe', 'skills'),
      (h) => path.join(h, '.agents', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'droid', label: 'Factory Droid', bins: ['droid'],
    detect: (h) => hasBin('droid'),
    dir: (h) => path.join(h, '.factory'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [
      (h) => path.join(h, '.factory', 'skills'),
      (h) => path.join(h, '.agents', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'hermes', label: 'Hermes Agent', bins: ['hermes'],
    detect: (h) => hasBin('hermes'),
    dir: (h) => path.join(h, '.hermes'),
    files: [
      { rel: ['SOUL.md'], src: 'spec' },
    ],
    skills: [(h) => path.join(h, '.hermes', 'skills')],
    patch: patchHermes,
  },
  {
    id: 'pi', label: 'Pi Coding Agent', bins: ['pi'],
    detect: (h) => hasBin('pi'),
    dir: (h) => path.join(h, '.pi', 'agent'),
    files: [
      { rel: ['AGENTS.md'], src: 'merged' },
    ],
    skills: [(h) => path.join(h, '.pi', 'agent', 'skills')],
    patch: null,
  },
  {
    id: 'openhands', label: 'OpenHands', bins: ['openhands'],
    detect: (h) => hasBin('openhands'),
    dir: (h) => path.join(h, '.openhands'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [
      (h) => path.join(h, '.openhands', 'skills'),
      (h) => path.join(h, '.agents', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'kilo', label: 'Kilo Code', bins: ['kilo'],
    detect: (h) => hasBin('kilo'),
    dir: (h) => path.join(h, '.config', 'kilo'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [
      (h) => path.join(h, '.kilo', 'skills'),
      (h) => path.join(h, '.agents', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'roo', label: 'Roo Code', bins: [],
    detect: (h) => fs.existsSync(path.join(h, '.roo')),
    dir: (h) => path.join(h, '.roo'),
    files: [
      { rel: ['rules', 'redcode.md'], src: 'spec' },
      { rel: ['rules', 'redcode-profile.md'], src: 'profile' },
    ],
    skills: [
      (h) => path.join(h, '.roo', 'skills'),
      (h) => path.join(h, '.agents', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'continue', label: 'Continue', bins: ['continue'],
    detect: (h) => hasBin('continue') || fs.existsSync(path.join(h, '.continue')),
    dir: (h) => path.join(h, '.continue'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [],
    patch: patchContinue,
  },
  {
    id: 'amazon-q', label: 'Amazon Q Developer', bins: ['q'],
    detect: (h) => hasBin('q'),
    dir: (h) => path.join(h, '.aws', 'amazonq'),
    files: [
      { rel: ['rules', 'redcode.md'], src: 'spec' },
      { rel: ['rules', 'redcode-profile.md'], src: 'profile' },
    ],
    skills: [],
    patch: null,
  },
  {
    id: 'open-interpreter', label: 'Open Interpreter', bins: ['interpreter'],
    detect: (h) => hasBin('interpreter'),
    dir: (h) => path.join(h, '.openinterpreter'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [(h) => path.join(h, '.agents', 'skills')],
    patch: null,
  },
  {
    id: 'swe-agent', label: 'SWE-agent', bins: ['sweagent'],
    detect: (h) => hasBin('sweagent'),
    dir: (h) => path.join(h, '.config', 'sweagent'),
    files: [],
    skills: [],
    patch: null,
  },
  {
    id: 'devin', label: 'Devin CLI', bins: ['devin'],
    detect: (h) => hasBin('devin'),
    dir: (h) => path.join(h, '.config', 'devin'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [
      (h) => path.join(h, '.config', 'devin', 'skills'),
      (h) => path.join(h, '.agents', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'jules', label: 'Jules', bins: ['jules'],
    detect: (h) => hasBin('jules'),
    dir: (h) => path.join(h, '.jules'),
    files: [],
    skills: [],
    patch: null,
  },
  {
    id: 'junie', label: 'Junie', bins: ['junie'],
    detect: (h) => hasBin('junie'),
    dir: (h) => path.join(h, '.junie'),
    files: [
      { rel: ['AGENTS.md'], src: 'spec' },
      { rel: ['ROSHAN.md'], src: 'profile' },
    ],
    skills: [
      (h) => path.join(h, '.junie', 'skills'),
      (h) => path.join(h, '.agents', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'windsurf', label: 'Windsurf / Devin Desktop', bins: ['windsurf', 'devin'],
    detect: (h) => hasBin('windsurf') || hasBin('devin') ||
      fs.existsSync(path.join(h, '.codeium', 'windsurf')) || fs.existsSync(path.join(h, '.devin')),
    dir: (h) => path.join(h, '.devin'),
    files: [
      { rel: ['global_rules.md'], src: 'spec' },
      { rel: ['rules', 'redcode.md'], src: 'spec' },
      { rel: ['rules', 'redcode-profile.md'], src: 'profile' },
      { rel: ['.', '..', '.codeium', 'windsurf', 'memories', 'global_rules.md'], src: 'spec', legacy: true },
    ],
    skills: [
      (h) => path.join(h, '.config', 'devin', 'skills'),
      (h) => path.join(h, '.codeium', 'windsurf', 'skills'),
    ],
    patch: null,
  },
  {
    id: 'openclaw', label: 'OpenClaw', bins: ['openclaw'],
    detect: (h) => hasBin('openclaw'),
    dir: (h) => path.join(h, '.openclaw'),
    files: [
      { rel: ['workspace', 'AGENTS.md'], src: 'spec' },
      { rel: ['workspace', 'SOUL.md'], src: 'profile' },
    ],
    skills: [(h) => path.join(h, '.openclaw', 'skills')],
    patch: null,
  },
];

// ---------------------------------------------------------------- patches

function patchAider(h, opts) {
  const cfg = path.join(h, '.aider.conf.yml');
  const spec = path.join(h, '.config', 'aider', 'AGENTS.md');
  const prof = path.join(h, '.config', 'aider', 'ROSHAN.md');
  let txt = '';
  try { txt = fs.readFileSync(cfg, 'utf8'); } catch {}
  if (/^\s*read\s*:/m.test(txt)) {
    return { status: 'warn', msg: '~/.aider.conf.yml already has a `read:` key — add the two paths manually' };
  }
  const block = `\n# added by redcode (idempotent)\nread:\n  - ${spec}\n  - ${prof}\n`;
  if (txt.includes('# added by redcode')) return null;
  if (opts.dryRun) return { status: 'would', msg: '~/.aider.conf.yml read: entries would be added' };
  fs.writeFileSync(cfg, txt.trimEnd() + block);
  return { status: 'ok', msg: '~/.aider.conf.yml — read: entries added' };
}

function patchHermes(h, opts) {
  const cfg = path.join(h, '.hermes', 'config.yaml');
  if (!fs.existsSync(cfg)) return null;
  let txt = '';
  try { txt = fs.readFileSync(cfg, 'utf8'); } catch {}
  if (txt.includes('# === redcode ===')) return null;
  if (/^\s*coding_instructions\s*:/m.test(txt)) {
    return { status: 'warn', msg: '~/.hermes/config.yaml already has coding_instructions — skipped' };
  }
  const profile = fs.readFileSync(PROFILE_SRC, 'utf8').split('\n').map((l) => '  ' + l).join('\n');
  const block = `\n# === redcode ===\ncoding_instructions: |\n${profile}\n# === /redcode ===\n`;
  if (opts.dryRun) return { status: 'would', msg: '~/.hermes/config.yaml coding_instructions would be added' };
  fs.writeFileSync(cfg, txt.trimEnd() + block);
  return { status: 'ok', msg: '~/.hermes/config.yaml — coding_instructions added' };
}

function patchContinue(h, opts) {
  const cfg = path.join(h, '.continue', 'config.yaml');
  if (!fs.existsSync(cfg)) {
    return { status: 'warn', msg: '~/.continue/config.yaml missing — rules not added (create the config first)' };
  }
  let txt = '';
  try { txt = fs.readFileSync(cfg, 'utf8'); } catch {}
  if (txt.includes('# === redcode ===')) return null;
  if (/^\s*rules\s*:/m.test(txt)) {
    return { status: 'warn', msg: '~/.continue/config.yaml already has rules: — add file:// refs manually' };
  }
  const spec = path.join(h, '.continue', 'AGENTS.md');
  const prof = path.join(h, '.continue', 'ROSHAN.md');
  const block = `\n# === redcode ===\nrules:\n  - uses: file://${spec}\n  - uses: file://${prof}\n# === /redcode ===\n`;
  if (opts.dryRun) return { status: 'would', msg: '~/.continue/config.yaml rules would be added' };
  fs.writeFileSync(cfg, txt.trimEnd() + block);
  return { status: 'ok', msg: '~/.continue/config.yaml — rules added' };
}

// ---------------------------------------------------------------- core

function agentDef(id) {
  return AGENTS.find((a) => a.id === id) || null;
}

function detectAgents(home) {
  const out = [];
  for (const a of AGENTS) {
    try { if (a.detect(home)) out.push(a); } catch {}
  }
  return out;
}

function wrapMdc(content) {
  return '---\ndescription: RedCode global rules (auto-installed by redcode)\nalwaysApply: true\n---\n\n' + content;
}

function filesForAgent(a, home, opts) {
  const root = opts.agentPath || a.dir(home);
  const files = [];
  for (const f of a.files) {
    let content = templateContent(f.src);
    if (f.wrap === 'mdc') content = wrapMdc(content);
    files.push({
      kind: f.src,
      optional: !!f.optional,
      to: path.join(root, ...f.rel),
      content,
      hash: shaOf(content),
    });
  }
  const skills = [];
  if (opts.agentPath) {
    // custom target root: self-contained layout, skills next to the spec
    const dir = path.join(root, 'skills');
    for (const s of collectSkills()) {
      skills.push({ to: path.join(dir, s.id, 'SKILL.md'), from: s.file });
    }
  } else {
    for (const dirFn of a.skills) {
      const dir = dirFn(home);
      for (const s of collectSkills()) {
        skills.push({ to: path.join(dir, s.id, 'SKILL.md'), from: s.file });
      }
    }
  }
  return { root, files, skills };
}

function writeItem(item, opts) {
  if (fs.existsSync(item.to)) {
    if (sha256(item.to) === item.hash) return 'same';
    if (opts.dryRun) return 'would-update';
    const bak = backup(item.to, opts);
    fs.writeFileSync(item.to, item.content);
    return bak ? 'updated' : 'overwritten';
  }
  if (opts.dryRun) return 'would-install';
  fs.mkdirSync(path.dirname(item.to), { recursive: true });
  fs.writeFileSync(item.to, item.content);
  return 'installed';
}

function copySkill(item, opts) {
  if (fs.existsSync(item.to) && sha256(item.to) === sha256(item.from)) return 'same';
  if (opts.dryRun) return 'would-install';
  fs.mkdirSync(path.dirname(item.to), { recursive: true });
  fs.copyFileSync(item.from, item.to);
  return 'installed';
}

function universalTargets(home, opts) {
  const root = opts.agentPath || path.join(home, '.agents');
  const files = [
    { to: path.join(root, 'AGENTS.md'), content: templateContent('merged'), hash: shaOf(templateContent('merged')) },
  ];
  const skills = [];
  for (const s of collectSkills()) {
    skills.push({ to: path.join(root, 'skills', s.id, 'SKILL.md'), from: s.file });
  }
  return { root, files, skills };
}

// ---------------------------------------------------------------- actions

function askSelection(detected) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    info('Multiple agents detected:');
    detected.forEach((d, i) => log(`  [${i + 1}] ${d.label}`));
    log('  [0] all of them');
    rl.question('\nSelect (0-' + detected.length + '): ', (ans) => {
      rl.close();
      const n = parseInt(ans, 10);
      if (n === 0 || Number.isNaN(n)) return resolve(detected);
      if (n >= 1 && n <= detected.length) return resolve([detected[n - 1]]);
      return resolve(detected);
    });
  });
}

async function selectAgents(opts) {
  const home = homeDir(opts);
  if (opts.agent) {
    const def = agentDef(opts.agent);
    if (!def) throw new Error(`Unknown agent '${opts.agent}'. Run 'redcode agents' for the list.`);
    return [def];
  }
  const detected = detectAgents(home);
  if (detected.length === 0) {
    warn('No agent detected — falling back to OpenCode layout');
    return [agentDef('opencode')];
  }
  if (detected.length > 1 && !opts.all && !opts.quiet && process.stdin.isTTY) {
    return askSelection(detected);
  }
  return detected;
}

async function doInstall(opts) {
  const home = homeDir(opts);
  const agents = await selectAgents(opts);

  info(`RedCode → ${home}`);
  if (opts.dryRun) info('DRY RUN — no files will be written\n');

  const targets = agents.map((a) => ({ agent: a, t: filesForAgent(a, home, opts) }));
  if (opts.universal) targets.push({ agent: { id: 'universal', label: '~/.agents (shared)' }, t: universalTargets(home, opts) });

  if (!opts.quiet) {
    for (const { agent, t } of targets) {
      log(`  ${C.cyan}${agent.label}${C.reset} → ${path.relative(home, t.root) || t.root}`);
    }
    log('');
  }

  let written = 0, fresh = 0;
  for (const { agent, t } of targets) {
    let aw = 0, af = 0;
    for (const item of t.files) {
      const r = writeItem(item, opts);
      if (r === 'same') { af++; continue; }
      if (r === 'skipped') continue;
      aw++;
      if (!opts.quiet) ok(`${path.relative(home, item.to)} — ${r}`);
    }
    for (const item of t.skills) {
      const r = copySkill(item, opts);
      if (r === 'same') { af++; continue; }
      aw++;
      if (!opts.quiet) ok(`${path.relative(home, item.to)} — ${r}`);
    }
    if (agent.patch && !opts.dryRun) {
      const r = agent.patch(home, opts);
      if (r && !opts.quiet) {
        if (r.status === 'ok') ok(r.msg);
        else if (r.status === 'would') ok(r.msg);
        else warn(r.msg);
      }
    } else if (agent.patch && opts.dryRun) {
      const r = agent.patch(home, opts);
      if (r && !opts.quiet && r.status === 'would') ok(r.msg);
    }
    written += aw; fresh += af;
  }

  if (!opts.quiet) {
    log('');
    info(`Done: ${written} file(s) written, ${fresh} already up to date.`);
  }
  return written;
}

function doStatus(opts) {
  const home = homeDir(opts);
  const agents = opts.agent ? [agentDef(opts.agent)].filter(Boolean) : detectAgents(home);
  if (!agents.length) agents.push(agentDef('opencode'));

  info(`RedCode status → ${home}\n`);
  let missing = 0, stale = 0, okCount = 0;
  for (const a of agents) {
    const t = filesForAgent(a, home, opts);
    log(`  ${C.dim}${a.label} → ${path.relative(home, t.root) || t.root}${C.reset}`);
    for (const item of t.files) {
      const exists = fs.existsSync(item.to);
      if (!exists) {
        missing++;
        log(`    ${C.red}✗${C.reset} ${path.relative(t.root, item.to)} — MISSING`);
      } else if (sha256(item.to) !== item.hash) {
        stale++;
        log(`    ${C.yellow}!${C.reset} ${path.relative(t.root, item.to)} — STALE`);
      } else {
        okCount++;
        log(`    ${C.green}✓${C.reset} ${path.relative(t.root, item.to)} — INSTALLED`);
      }
    }
    for (const item of t.skills) {
      const exists = fs.existsSync(item.to);
      if (!exists) {
        missing++;
        log(`    ${C.red}✗${C.reset} ${path.relative(t.root, item.to)} — MISSING`);
      } else if (sha256(item.to) !== sha256(item.from)) {
        stale++;
        log(`    ${C.yellow}!${C.reset} ${path.relative(t.root, item.to)} — STALE`);
      } else {
        okCount++;
      }
    }
  }
  log('');
  info(`${okCount} installed, ${stale} stale, ${missing} missing.`);
  return missing + stale;
}

function doAgents(opts) {
  const home = homeDir(opts);
  const detected = detectAgents(home).map((a) => a.id);
  info(`Supported agents (${AGENTS.length}) — detected under ${home}:`);
  for (const a of AGENTS) {
    if (detected.includes(a.id)) ok(`${a.id} — ${a.label}`);
    else log(`  ${C.dim}– ${a.id} (${a.label}) not detected${C.reset}`);
  }
  return 0;
}

function doUninstall(opts) {
  if (!opts.yes) {
    console.error('Uninstall removes installed copies. Re-run with --yes to confirm.');
    process.exit(1);
  }
  const home = homeDir(opts);
  let agents = opts.agent ? [agentDef(opts.agent)].filter(Boolean) : detectAgents(home);
  if (!agents.length) agents = [agentDef('opencode')];

  if (opts.dryRun) info('DRY RUN — nothing will be removed\n');
  let removed = 0, kept = 0;
  for (const a of agents) {
    const t = filesForAgent(a, home, opts);
    for (const item of t.files) {
      if (!fs.existsSync(item.to)) continue;
      if (sha256(item.to) !== item.hash) {
        kept++;
        if (!opts.quiet) warn(`${path.relative(t.root, item.to)} — modified, kept`);
        continue;
      }
      removed++;
      if (opts.dryRun) {
        if (!opts.quiet) ok(`${path.relative(t.root, item.to)} would be removed`);
        continue;
      }
      fs.unlinkSync(item.to);
      try { fs.rmdirSync(path.dirname(item.to)); } catch {}
      if (!opts.quiet) ok(`${path.relative(t.root, item.to)} removed`);
    }
    for (const item of t.skills) {
      if (!fs.existsSync(item.to)) continue;
      if (sha256(item.to) !== sha256(item.from)) {
        kept++;
        if (!opts.quiet) warn(`${path.relative(t.root, item.to)} — modified, kept`);
        continue;
      }
      removed++;
      if (opts.dryRun) {
        if (!opts.quiet) ok(`${path.relative(t.root, item.to)} would be removed`);
        continue;
      }
      fs.unlinkSync(item.to);
      try { fs.rmdirSync(path.dirname(item.to)); } catch {}
      if (!opts.quiet) ok(`${path.relative(t.root, item.to)} removed`);
    }
  }
  if (!opts.quiet) info(`\nDone: ${removed} removed, ${kept} kept.`);
}

// ---------------------------------------------------------------- CLI

function parseArgs(argv) {
  const opts = {
    dryRun: false, force: false, noBackup: false, quiet: false, yes: false,
    all: false, universal: false, agent: null, agentPath: null, home: null,
    command: 'install', _: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--version' || a === '-v') { console.log(pkg.version); process.exit(0); }
    else if (a === '--force') opts.force = true;
    else if (a === '--no-backup') opts.noBackup = true;
    else if (a === '--quiet') opts.quiet = true;
    else if (a === '--yes') opts.yes = true;
    else if (a === '--all') opts.all = true;
    else if (a === '--universal') opts.universal = true;
    else if (a === '--agent') opts.agent = argv[++i] || null;
    else if (a.startsWith('--agent=')) opts.agent = a.slice(8);
    else if (a === '--agent-path') opts.agentPath = argv[++i] || null;
    else if (a.startsWith('--agent-path=')) opts.agentPath = a.slice(13);
    else if (a === '--home') opts.home = argv[++i] || null;
    else if (a.startsWith('--home=')) opts.home = a.slice(7);
    else if (a.startsWith('-')) {
      console.error(`Unknown option: ${a}`); process.exit(2);
    } else opts._.push(a);
  }
  if (opts._.length) {
    const first = opts._[0];
    if (['install', 'status', 'update', 'uninstall', 'agents'].includes(first)) opts.command = first;
    else { console.error(`Unknown command: ${first}`); process.exit(2); }
  }
  if (opts.command === 'update') opts.force = true;
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  try {
    switch (opts.command) {
      case 'install':
      case 'update': return await doInstall(opts);
      case 'status': return doStatus(opts);
      case 'agents': return doAgents(opts);
      case 'uninstall': return doUninstall(opts);
      default: throw new Error(`Unhandled command: ${opts.command}`);
    }
  } catch (e) {
    console.error(`\n${C.red}Error:${C.reset} ${e.message}`);
    process.exit(1);
  }
}

main();
