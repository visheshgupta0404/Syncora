# Syncora project workflow

- This checkout targets https://github.com/visheshgupta0404/Syncora.git.
- The user requests that completed code changes be committed and pushed after relevant checks pass. Continue this workflow for future work in this project unless the user says otherwise.
- Work directly on `main` and push to `origin/main`. Do not create a new branch unless the user explicitly requests one. Never force-push or overwrite unrelated work.
- Before committing, inspect the diff and exclude credentials, `.env.local`, `node_modules`, and generated `dist` files. Keep `.env.example` limited to placeholders.
- For application changes, run `npm test` and `npm run build`. Report failures before claiming the change is ready.
