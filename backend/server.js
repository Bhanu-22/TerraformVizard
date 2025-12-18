const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(express.json());

// Simple CORS for local frontend
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const TF_DIR = path.join(__dirname, 'terraform', 'demo');
// Active workspace stored in memory only. Initialized to demo workspace.
let activeWorkspace = TF_DIR;

function hasTfFileRecursive(dir) {
  try {
    const entries = require('fs').readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isFile() && p.endsWith('.tf')) return true;
      if (e.isDirectory()) {
        if (hasTfFileRecursive(p)) return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const ps = spawn(cmd, args, { cwd, shell: true });
    let out = '';
    let err = '';
    ps.stdout.on('data', (d) => (out += d.toString()));
    ps.stderr.on('data', (d) => (err += d.toString()));
    ps.on('close', (code) => {
      if (code === 0) return resolve({ stdout: out, stderr: err });
      const e = new Error(`${cmd} ${args.join(' ')} failed with code ${code}`);
      e.stdout = out;
      e.stderr = err;
      console.error('Command failed:', cmd, args.join(' '), 'cwd=', cwd, 'code=', code, 'stderr=', err)
      return reject(e);
    });
  });
}

// POST /plan - runs init, plan, show -json and returns parsed plan + summary
app.post('/plan', async (req, res) => {
  try {
    console.log('[plan] activeWorkspace=', activeWorkspace)
    // terraform init -input=false
    await runCommand('terraform', ['init', '-input=false', '-no-color'], activeWorkspace);

    // terraform plan -out=tfplan -input=false
    await runCommand('terraform', ['plan', '-out=tfplan', '-input=false', '-no-color'], activeWorkspace);

    // terraform show -json tfplan
    const { stdout } = await runCommand('terraform', ['show', '-json', 'tfplan'], activeWorkspace);
    let planJson = {};
    try {
      planJson = JSON.parse(stdout);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse terraform show output', details: e.message, raw: stdout });
    }

    // Build summary from resource_changes
    const summary = { create: 0, update: 0, delete: 0, no_change: 0 };
    const rc = planJson.resource_changes || [];
    for (const r of rc) {
      const actions = Array.isArray(r.change && r.change.actions) ? r.change.actions : [];
      const hasCreate = actions.includes('create');
      const hasDelete = actions.includes('delete');
      const hasUpdate = actions.includes('update');
      const hasNoop = actions.includes('no-op') || actions.length === 0;

      if (hasCreate && !hasDelete) summary.create += 1;
      else if (hasDelete && !hasCreate) summary.delete += 1;
      else if (hasUpdate || (hasCreate && hasDelete)) summary.update += 1;
      else if (hasNoop) summary.no_change += 1;
      else summary.no_change += 1;
    }

    return res.json({ plan: planJson, summary });
  } catch (err) {
    console.error('[plan] error', err && err.stack ? err.stack : err)
    return res.status(500).json({ error: err.message, stderr: err.stderr || null, stdout: err.stdout || null });
  }
});

// GET /graph - returns raw DOT text from terraform graph
app.get('/graph', async (req, res) => {
  try {
    console.log('[graph] activeWorkspace=', activeWorkspace)
    const { stdout } = await runCommand('terraform', ['graph'], activeWorkspace);
    return res.json({ dot: stdout });
  } catch (err) {
    console.error('[graph] error', err && err.stack ? err.stack : err)
    return res.status(500).json({ error: err.message, stderr: err.stderr || null });
  }
});

// POST /workspace - set active Terraform workspace (in-memory only)
app.post('/workspace', (req, res) => {
  try {
    const p = req.body && req.body.path;
    if (!p || typeof p !== 'string') return res.status(400).json({ error: 'path is required' });
    const abs = path.resolve(p);
    // validate exists and is directory
    const fs = require('fs');
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      return res.status(400).json({ error: 'path does not exist or is not a directory' });
    }
    if (!hasTfFileRecursive(abs)) {
      console.warn('[workspace] selected directory has no .tf files:', abs)
      return res.status(400).json({ error: 'directory does not contain any .tf files' });
    }
    activeWorkspace = abs;
    console.log('[workspace] activeWorkspace set to', activeWorkspace)
    return res.json({ workspace: activeWorkspace });
  } catch (err) {
    console.error('[workspace] error', err && err.stack ? err.stack : err)
    return res.status(500).json({ error: err.message });
  }
});

// GET /workspace - return current active workspace (in-memory)
app.get('/workspace', (req, res) => {
  return res.json({ workspace: activeWorkspace });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Terraform UI backend listening on http://localhost:${PORT}`));
