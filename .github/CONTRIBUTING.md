# Contributing Guide - ScrapMarket App

## Recommended Git Flow

### 1. Branch Structure

```
main (production)
├── develop (development)
├── feature/feature-name
├── hotfix/urgent-fix
└── release/version-x.x.x
```

### 2. Commit Convention

Use **Conventional Commits** format:

```
type(scope): description

[optional: commit body]

[optional: footer with breaking changes]
```

#### Allowed types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting changes (spaces, commas, etc.)
- `refactor`: Code refactoring
- `test`: Add or modify tests
- `chore`: Build, dependencies changes, etc.

#### Examples:
```bash
feat(search): implement product search
fix(auth): fix login validation
docs(readme): update installation instructions
style(ui): improve spacing in results screen
refactor(api): optimize endpoint calls
test(search): add search tests
chore(deps): update navigation dependencies
```

### 3. Development Process

#### For new features:
```bash
# 1. Create branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/product-search

# 2. Develop and make frequent commits
git add .
git commit -m "feat(search): add search component"

# 3. Push and create Pull Request
git push origin feature/product-search
```

#### For urgent fixes:
```bash
# 1. Create branch from main
git checkout main
git pull origin main
git checkout -b hotfix/fix-search-crash

# 2. Make the fix
git add .
git commit -m "fix(search): fix crash on empty search"

# 3. Direct merge to main and develop
```

### 4. Pull Request Rules

#### Before creating PR:
- [ ] Code compiles without errors
- [ ] Tests pass (when implemented)
- [ ] Code follows project conventions
- [ ] Documentation updated if necessary

#### PR Title:
```
feat: implement product search
fix: fix authentication validation
```

#### PR Description:
```markdown
## Description
Brief description of the changes made.

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
- [ ] Tested on Android
- [ ] Tested on iOS
- [ ] Tested on web

## Screenshots (if applicable)
[Add screenshots]
```

### 5. Git Hooks Configuration (Optional)

To automate validations:

```bash
# Install husky for git hooks
npm install --save-dev husky

# Configure pre-commit hook
npx husky add .husky/pre-commit "npm run lint"
npx husky add .husky/commit-msg "npx commitlint --edit \$1"
```

### 6. Release Tags

```bash
# Create tag for new version
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### 7. Useful Commands

```bash
# View commit history
git log --oneline --graph

# View unstaged changes
git diff

# View staged changes
git diff --cached

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (remove changes)
git reset --hard HEAD~1

# Clean up deleted local branches
git remote prune origin

# View local and remote branches
git branch -a
```

### 8. Recommended Configuration

```bash
# Configure user
git config --global user.name "Dante"
git config --global user.email "danteluchini@gmail.com"

# Configure editor
git config --global core.editor "code --wait"

# Configure merge tool
git config --global merge.tool "vscode"
git config --global mergetool.vscode.cmd "code --wait \$MERGED"
```

## Development Environments

### Local Development
- n8n running in Docker (localhost:5678)
- Supabase in the cloud
- App in development mode

### Staging
- n8n on test VPS
- Supabase in the cloud
- App in staging mode

### Production
- n8n on final VPS
- Supabase in the cloud
- App in production mode

## Important Notes

1. **Never commit:**
   - `.env` files with real credentials
   - `node_modules/`
   - Build files
   - Logs

2. **Always commit:**
   - Source code changes
   - Dependency updates (`package.json`)
   - Project configurations
   - Documentation

3. **Before each commit:**
   - Review what files will be committed (`git status`)
   - Ensure code compiles
   - Write descriptive commit message
