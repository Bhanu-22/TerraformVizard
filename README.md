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

1. Open a terminal and start the backend. If you use provider credentials (AWS), start the server from the shell where those env vars or profiles are configured so Terraform can access them:

```powershell
cd C:\Users\BhanuPraksh\Documents\TerraformAppViz\terraform-ui-mvp\backend
npm install express
node server.js
```

Frontend (run UI)

1. In a separate terminal:

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

Safety & Constraints

- This tool is strictly read-only: it only runs `init`, `plan`, `show -json`, and `graph`. There is no `apply` endpoint or destructive functionality.
- Workspace path is validated and stored in memory only; it is not persisted to disk.
- Do NOT commit credentials or state files. A sensible `.gitignore` is included to exclude `.terraform`, `*.tfstate*`, and other artifacts.

Troubleshooting

- If `terraform plan` fails due to provider authentication, ensure the backend server was started from a shell with the correct environment (AWS_PROFILE or AWS_* env vars).
- If remote backend configuration prevents a local `plan`, you can test locally by running `terraform init -backend=false` and `terraform plan -out=tfplan -input=false -no-color` in that workspace to isolate issues (note: skipping backend may change behavior compared to remote state).

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

If you want, I can generate the `.gitignore` or create the remote for you using `gh` (if available).

License / Next Steps

- This project is a local, non-destructive tool. Consider adding module grouping or visual improvements to the graph. If you want, I can add node grouping by module path next.

