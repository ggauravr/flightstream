---
layout: page
title: Contributing
permalink: /contributing/
---

# 🤝 Contributing to FlightStream

Thank you for your interest in contributing! This guide will help you get started with contributing to FlightStream framework.

## 🎯 Ways to Contribute

### 🐛 Bug Reports
Found a bug? Please [open an issue](https://github.com/ggauravr/flightstream/issues) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Node.js version, OS, etc.)

### 💡 Feature Requests
Have an idea for improvement? [Create a feature request](https://github.com/ggauravr/flightstream/issues) with:
- Use case description
- Proposed solution
- Alternative approaches considered

### 📝 Documentation
Help improve our docs:
- Fix typos or unclear explanations
- Add examples or tutorials
- Improve API documentation
- Translate content

### 🔧 Code Contributions
- Fix bugs
- Implement new features
- Add new adapters
- Improve performance
- Add tests

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - For version control
- **GitHub account** - For submitting PRs

### Development Setup

1. **Fork the repository**
   ```bash
   # Visit https://github.com/ggauravr/flightstream
   # Click "Fork" button
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/flightstream.git
   cd flightstream
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

5. **Start development**
   ```bash
   # Start the example server
   npm start
   
   # In another terminal, run the test client
   npm test
   
   # To run the actual test suite
   npm run test:all
   ```

## 🏗️ Project Structure

Understanding the codebase organization:

```
flightstream/
├── packages/
│   ├── core/              # Core Flight packages
│   │   ├── server/        # Core server framework
│   │   │   ├── src/
│   │   │   │   ├── flight-server.js
│   │   │   │   ├── flight-service-base.js
│   │   │   │   ├── protocol/
│   │   │   │   │   ├── handlers.js
│   │   │   │   │   └── actions.js
│   │   │   │   └── index.js
│   │   │   ├── proto/
│   │   │   │   └── flight.proto
│   │   │   └── package.json
│   │   ├── client/        # Core client framework
│   │   │   ├── src/
│   │   │   │   ├── flight-client.js
│   │   │   │   ├── flight-client-base.js
│   │   │   │   ├── flight-protocol-client.js
│   │   │   │   ├── utils/
│   │   │   │   │   ├── connection-manager.js
│   │   │   │   │   ├── retry-handler.js
│   │   │   │   │   └── streaming-utils.js
│   │   │   │   └── index.js
│   │   │   └── package.json
│   │   └── shared/        # Shared utilities
│   │       ├── src/
│   │       │   ├── arrow-builder.js
│   │       │   ├── constants.js
│   │       │   ├── protocol-utils.js
│   │       │   └── index.js
│   │       └── package.json
│   ├── adapters/          # Data source adapters
│   │   └── csv/           # CSV file adapter
│   │       ├── src/
│   │       │   ├── csv-service.js
│   │       │   ├── csv-streamer.js
│   │       │   ├── csv-arrow-builder.js
│   │       │   └── index.js
│   │       └── package.json
│   ├── utils/             # Utility packages
│   │   └── arrow/         # Arrow utilities
│   │       ├── src/
│   │       │   ├── arrow-builder.js
│   │       │   ├── schema-inference.js
│   │       │   ├── streaming-utils.js
│   │       │   ├── type-system/
│   │       │   │   ├── index.js
│   │       │   │   ├── type-detector.js
│   │       │   │   ├── type-registry.js
│   │       │   │   └── type-transformer.js
│   │       │   └── index.js
│   │       └── package.json
│   ├── frameworks/        # Framework integrations (future)
│   ├── tools/             # Development tools (future)
│   └── examples/          # Reference implementations
│       ├── basic-server/
│       └── basic-client/
├── docs/                  # Documentation website
├── data/                  # Sample data files
├── coverage/              # Test coverage reports
├── .github/               # GitHub workflows and templates
├── jest.config.js         # Jest configuration
├── lerna.json            # Lerna monorepo configuration
└── package.json          # Root package configuration
```

## 📋 Development Guidelines

### Code Style

This project uses ESLint for code linting and style enforcement:

```bash
# Check code style
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

**Key principles:**
- Use modern ES6+ features
- Prefer `async/await` over callbacks
- Use descriptive variable names
- Add JSDoc comments for public APIs
- Follow existing patterns in the codebase

### Commit Messages

Follow the [Conventional Commits](https://conventionalcommits.org/) format:

```
type(scope): description

[optional body]

[optional footer]
```

**Examples:**
```bash
feat(adapters-csv): add support for custom delimiters
fix(core-server): handle connection errors gracefully
docs(api): update FlightServer constructor examples
test(utils-arrow): add tests for schema inference
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions/changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

### Testing

#### Running Tests
```bash
# Run all tests
npm run test:all

# Test specific packages
npm run test:server
npm run test:client
npm run test:utils

# Test in watch mode
npm run test:watch
```

#### Writing Tests
```javascript
// Example test structure
import { FlightServer } from '@flightstream/core-server/flight-server';

describe('FlightServer', () => {
  let server;
  
  beforeEach(() => {
    server = new FlightServer({ port: 0 });
  });
  
  afterEach(async () => {
    if (server.isRunning()) {
      await server.stop();
    }
  });
  
  it('should start successfully', async () => {
    const port = await server.start();
    expect(port).toBeGreaterThan(0);
    expect(server.isRunning()).toBe(true);
  });
});
```

### Package Development

#### Adding a New Package

1. **Create package directory**
   ```bash
   mkdir -p packages/adapters/my-adapter
   cd packages/adapters/my-adapter
   ```

2. **Initialize package**
   ```bash
   npm init -y
   ```

3. **Update package.json**
   ```json
   {
     "name": "@flightstream/adapters-my-adapter",
     "version": "1.0.0-alpha.1",
     "description": "My custom adapter for FlightStream",
     "main": "src/index.js",
     "type": "module",
     "scripts": {
       "test": "NODE_OPTIONS=\"--experimental-vm-modules\" jest",
       "lint": "eslint src/**/*.js"
     },
     "dependencies": {
       "@flightstream/core-server": "file:../../core/server"
     },
     "peerDependencies": {
       "apache-arrow": "^14.0.0"
     }
   }
   ```

4. **Add to workspace**
   ```json
   // In root package.json
   {
     "workspaces": [
       "packages/core/*",
       "packages/adapters/*",
       "packages/utils/*",
       "packages/frameworks/*",
       "packages/tools/*"
     ]
   }
   ```

#### Building Packages
```bash
# Build all packages
npm run build

# Build specific packages
npm run build:server
npm run build:client
npm run build:utils
```

## 🔧 Development Workflow

### 1. Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make your changes**
   - Follow the code style guidelines
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm run test:all
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): your feature description"
   ```

### 2. Submitting a Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/your-feature
   ```

2. **Create a Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select your feature branch
   - Fill out the PR template

3. **PR Checklist**
   - [ ] Tests pass
   - [ ] Code follows style guidelines
   - [ ] Documentation updated
   - [ ] No breaking changes (or documented)
   - [ ] Commit messages follow convention

### 3. Review Process

1. **Automated Checks**
   - CI/CD pipeline runs tests
   - Code coverage is checked
   - Linting is enforced

2. **Code Review**
   - Maintainers review your code
   - Address any feedback
   - Make requested changes

3. **Merge**
   - Once approved, PR is merged
   - Changes are included in next release

## 📦 Package Release Process

### Version Management

This project uses Lerna for version management:

```bash
# Patch release (bug fixes)
npm run version:patch

# Minor release (new features)
npm run version:minor

# Major release (breaking changes)
npm run version:major

# Pre-release versions
npm run version:alpha
npm run version:beta
npm run version:rc
```

### Publishing

```bash
# Publish all packages
npm run publish:latest

# Publish pre-release versions
npm run publish:alpha
npm run publish:beta
npm run publish:rc
```

## 🐛 Debugging

### Common Issues

1. **Module not found errors**
   ```bash
   # Clean and reinstall
   npm run clean
   npm install
   ```

2. **Test failures**
   ```bash
   # Run tests with verbose output
   npm run test:all -- --verbose
   ```

3. **Linting errors**
   ```bash
   # Fix auto-fixable issues
   npm run lint:fix
   ```

### Development Tools

```bash
# Start server in development mode
npm run dev

# Run tests in watch mode
npm run test:watch

# Check for outdated dependencies
npm outdated

# Audit dependencies
npm run audit:check
```

## 📚 Additional Resources

- [API Reference]({{ '/api-reference/' | relative_url }}) - Complete API documentation
- [Core Architecture]({{ '/core-architecture/' | relative_url }}) - Design patterns and diagrams
- [GitHub Issues](https://github.com/ggauravr/flightstream/issues) - Report bugs and request features
- [GitHub Discussions](https://github.com/ggauravr/flightstream/discussions) - Community discussions

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the project's code of conduct

Thank you for contributing to FlightStream! 🚀 