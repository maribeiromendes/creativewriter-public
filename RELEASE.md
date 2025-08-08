# Release Process

This document describes how to release CreativeWriter 2 to the public repository for self-hosters.

## Release Workflow

The project uses a **release branch** strategy to control what gets published to the public repository:

- **`main` branch**: Private development branch
- **`release` branch**: Public release branch (auto-syncs to public repo)

## How to Release

### 1. Prepare for Release

```bash
# Make sure main branch is ready
git checkout main
git pull origin main

# Run tests and build
npm run build
npm run lint

# Verify everything works
```

### 2. Create Release

```bash
# Switch to release branch
git checkout release
git pull origin release

# Merge main into release (or cherry-pick specific commits)
git merge main

# Or for selective releases:
# git cherry-pick <commit-hash>
```

### 3. Update Release Documentation

```bash
# Update version in package.json if needed
# Update CHANGELOG.md or release notes
# Ensure README-PUBLIC.md is current
```

### 4. Push to Release

```bash
# Push to release branch - this triggers the public sync
git push origin release
```

### 5. Automated Sync

The GitHub Action will automatically:
- Detect the push to `release` branch
- Sync the `release` branch to the `main` branch of the public repository
- Update the public repository for self-hosters

## Manual Sync (if needed)

You can manually trigger the sync workflow:
1. Go to GitHub Actions in the private repository
2. Find "Sync to Public Repository" workflow
3. Click "Run workflow" button
4. Select the `release` branch

## Release Strategy

**Development Flow:**
```
feature branches → main → release → public repo
```

**Benefits:**
- ✅ **Controlled releases** - Only stable code goes public
- ✅ **Private development** - Work on features privately
- ✅ **Clean public history** - Curated commits for self-hosters
- ✅ **Selective releases** - Cherry-pick important fixes

## Release Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`) 
- [ ] Linting passes (`npm run lint`)
- [ ] Docker images build successfully
- [ ] Documentation is updated
- [ ] Version bumped (if applicable)
- [ ] CHANGELOG updated (if maintained)
- [ ] Release branch updated
- [ ] Pushed to trigger public sync

## Version Management

Consider using semantic versioning and Git tags:

```bash
# Tag the release
git tag v1.2.3
git push origin v1.2.3

# The tag will also sync to public repository
```

This ensures self-hosters can easily identify and use specific versions.