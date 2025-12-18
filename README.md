# Terraform UI MVP (Local, Read-Only)

Lightweight local web UI to run safe, read-only Terraform analysis and visualize plans with React Flow.

Prerequisites
- Node.js + npm
- Terraform CLI (on PATH)
- Optional: GitHub CLI (`gh`) for repo creation

Repository layout

```
terraform-ui-mvp/
├── backend/                # Express server that runs terraform commands
├── frontend/               # Vite + React UI
└── README.md
```

Backend (run server)

1. Install dependencies and start the backend. If you use provider credentials (AWS), start the server from the shell where those env vars or profiles are configured so Terraform can access them:

```powershell
cd C:\Users\BhanuPraksh\Documents\TerraformAppViz\terraform-ui-mvp\backend
npm install
npm start     # or: node server.js
```

Frontend (run UI)

1. In a separate terminal install and run the frontend dev server:

```powershell
cd C:\Users\BhanuPraksh\Documents\TerraformAppViz\terraform-ui-mvp\frontend
npm install
npm run dev
```

2. Open the Vite URL shown by the command (typically http://localhost:5173).

Usage

- Enter or paste the absolute path to a Terraform project folder in the workspace input and click `Load Workspace`.
- After the server validates the folder (it must contain at least one `.tf` file), the `Plan` button becomes enabled.
- Click `Plan` to run `terraform init`, `terraform plan -out=tfplan`, `terraform show -json tfplan`, and `terraform graph` in the selected workspace. The UI shows the plan summary, raw JSON, and an interactive dependency graph.

Key UI features

- Draft Mode (frontend-only): make in-memory edits to resources to preview hypothetical changes without touching files or running Terraform.
- Impact Preview (blast-radius): select a resource and show direct/transitive impacts; includes draft-aware overlays and severity annotations.
- Value Flow Tracing: trace where attribute values originate (literal, variable, module output, other resource attributes) using plan metadata.
- Output Usage Tracing: find modules/resources that consume a given output or module output.
- Drift Detection: conservative, read-only indicators for resources that differ from prior state (drifted) and resources present only in prior state (orphaned).

Safety & Constraints

- This tool is strictly read-only: it only runs `init`, `plan`, `show -json`, and `graph`. There is no `apply` endpoint or destructive functionality.
- Workspace path is validated and stored in memory only; it is not persisted to disk.
- Draft Mode is frontend-only and stored only in memory; drafts are not written to disk.
- Do NOT commit credentials or state files. A sensible `.gitignore` is included to exclude `.terraform`, `*.tfstate*`, and other artifacts.

Troubleshooting

- If `terraform plan` fails due to provider authentication, ensure the backend server was started from a shell with the correct environment (AWS_PROFILE or AWS_* env vars).
- If remote backend configuration prevents a local `plan`, you can test locally by running `terraform init -backend=false` and `terraform plan -out=tfplan -input=false -no-color` in that workspace to isolate issues (note: skipping backend may change behavior compared to remote state).

Windows notes

- On Windows, prefer starting the backend from PowerShell where provider credentials or `AWS_PROFILE` are set. Long path or permission issues may require running the terminal as an appropriate user.

Development notes

- The frontend includes several analyzers (value-flow, output-usage, drift analysis) that operate only on the `terraform show -json` output and the dependency graph; they do not parse `.tf` files or run additional Terraform commands.

Pushing to GitHub

1. Initialize git and push as usual:

```powershell
cd C:\Users\BhanuPraksh\Documents\TerraformAppViz\terraform-ui-mvp
git init
git add .
git commit -m "chore: initial commit - Terraform UI MVP"
```

2. Create a remote and push:

```powershell
gh repo create  # optional interactive flow
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

Pushing to GitHub

1. Create a `.gitignore` (already present) and initialize git:

```powershell
cd C:\Users\BhanuPraksh\Documents\TerraformAppViz\terraform-ui-mvp
git init
git add .
git commit -m "chore: initial commit - Terraform UI MVP"
```

2. Create a repo on GitHub (web UI or `gh repo create`) and push:

```powershell
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

If you want, I can generate or tighten the `.gitignore`, create the remote via `gh`, or add node scripts for convenience.

License / Next Steps

- This project is a local, non-destructive tool. Consider adding module grouping or visual improvements to the graph. If you want, I can add node grouping by module path next.

