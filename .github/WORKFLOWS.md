# GitHub Workflows

This directory contains GitHub Actions workflows for the FlightStream monorepo, configured to work with Lerna for efficient package management.

## 📋 Available Workflows

### 🔄 CI (`ci.yml`)
**Triggers:** Push to `main`/`develop`, Pull Requests to `main`/`develop`

Runs comprehensive testing across the monorepo:
- **Multi-Node Testing**: Tests on Node.js 18.x, 20.x, and 21.x
- **Lerna Commands**: Uses `npx lerna run` for efficient package testing
- **Parallel Package Testing**: Tests each package independently
- **Integration Testing**: End-to-end testing with the example server
- **Coverage Reporting**: Uploads coverage to Codecov

**Key Commands:**
```bash
npx lerna run lint          # Run linting across all packages
npx lerna run test          # Run tests across all packages
npx lerna run test --scope=@flightstream/core  # Test specific package
```

### 🚀 Release (`release.yml`)
**Triggers:** Push of version tags (`v*`)

Automated release process:
- **Lerna Publishing**: Uses `lerna publish from-package` for efficient publishing
- **Pre-release Testing**: Runs tests and linting before publishing
- **GitHub Releases**: Automatically creates GitHub releases with changelog
- **NPM Publishing**: Publishes packages to npm registry

**Usage:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

### 🔒 Security (`security.yml`)
**Triggers:** Push to `main`/`develop`, PRs to `main`, Weekly schedule

Security-focused workflows:
- **Dependency Auditing**: Uses `npm run audit:check` (Lerna-aware)
- **CodeQL Analysis**: Static code analysis for security vulnerabilities
- **Dependency Review**: Automated review of dependency changes in PRs

### 📦 Lerna Operations (`lerna.yml`)
**Triggers:** Manual workflow dispatch

Manual Lerna operations for versioning and publishing:
- **Version Bumping**: Patch, minor, or major version updates
- **Selective Publishing**: Option to publish only changed packages
- **Changelog Generation**: Automatic changelog based on conventional commits

**Usage:**
1. Go to Actions → Lerna Operations
2. Select version type (patch/minor/major)
3. Choose whether to publish
4. Click "Run workflow"

### 🔄 Dependencies (`dependencies.yml`)
**Triggers:** Weekly schedule, Manual dispatch

Automated dependency management:
- **Dependency Updates**: Weekly automated updates
- **Test Validation**: Ensures updates don't break functionality
- **PR Creation**: Creates PRs for review of dependency updates

## 🛠️ Lerna Integration

### Package Testing
```bash
# Test all packages
npx lerna run test

# Test specific package
npx lerna run test --scope=@flightstream/core

# Test with parallel execution
npx lerna run test --parallel

# Test with streaming output
npx lerna run test --stream
```

### Package Linting
```bash
# Lint all packages
npx lerna run lint

# Lint with auto-fix
npx lerna run lint:fix

# Lint specific package
npx lerna run lint --scope=@flightstream/csv-service
```

### Package Publishing
```bash
# Check what would be published
npx lerna changed

# Publish changed packages
npx lerna publish

# Publish from package.json versions
npx lerna publish from-package
```

### Version Management
```bash
# Bump patch versions
npx lerna version patch

# Bump minor versions
npx lerna version minor

# Bump major versions
npx lerna version major
```

## 🔧 Configuration

### Required Secrets
- `NPM_TOKEN`: NPM authentication token for publishing
- `GITHUB_TOKEN`: GitHub token for repository access
- `CODECOV_TOKEN`: Codecov token for coverage reporting

### Environment Variables
- `NODE_AUTH_TOKEN`: Used for npm authentication
- `GITHUB_TOKEN`: Used for GitHub API access

## 📊 Workflow Status

All workflows are configured to:
- ✅ Run on Ubuntu latest
- ✅ Use Node.js 20.x as primary version
- ✅ Cache npm dependencies for faster builds
- ✅ Use Lerna for efficient monorepo operations
- ✅ Provide detailed logging and error reporting

## 🚨 Troubleshooting

### Common Issues

1. **Package Not Found**: Ensure package names use full scope (`@flightstream/core`)
2. **Lerna Command Fails**: Check that Lerna is properly configured in `lerna.json`
3. **Publishing Fails**: Verify `NPM_TOKEN` secret is set correctly
4. **Tests Fail**: Check that all packages have proper test scripts

### Debug Commands
```bash
# List all packages
npx lerna list

# Check what's changed
npx lerna changed

# Show Lerna info
npx lerna info

# Check package dependencies
npx lerna ls --graph
```

## 📈 Performance

The workflows are optimized for:
- **Parallel Execution**: Where possible, jobs run in parallel
- **Caching**: npm dependencies are cached between runs
- **Selective Testing**: Only changed packages are tested when possible
- **Efficient Commands**: Using Lerna's optimized commands for monorepo operations 