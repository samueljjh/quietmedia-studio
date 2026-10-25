# CLAUDE.md

## Workflow: branch, preview, then merge (always follow this)

Every change goes through a branch and a preview. Nothing reaches `main` until Samuel has seen it and said yes.

1. **Make a branch for each change.** Never commit or push directly to `main`. Start from the latest `main` and give the branch a short descriptive name (e.g. `fix-login-button`), unless the session has already assigned a branch name, in which case use that.
2. **Commit and push the branch** to GitHub.
3. **Open a pull request into `main`** so the change can be reviewed in one place.
4. **Give Samuel a way to view the change before merging:**
   - A live preview link of the branch, using:
     `https://raw.githack.com/samueljjh/quietmedia-studio/<branch-name>/index.html`
     (swap in another page path if the change is on a different page).
   - The pull request link, so the code changes can be seen side by side.
   - A short plain-English summary of what changed and anything to check, plus a screenshot where it helps.
5. **Wait for approval.** Do not merge the pull request until Samuel explicitly says to merge it. If tweaks are requested, make them on the same branch and share the preview again.
6. **After merging**, the live site (`studio.quietmedia.co.uk`) updates from `main` via GitHub Pages.
