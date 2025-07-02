# Contributing to FlightStream Arrow Flight Server Framework

Thank you for your interest in contributing to FlightStream - Arrow Flight Server Framework! This guide will help you get started with contributing to this open-source project.

## 🎯 How to Contribute

I welcome contributions in many forms:
- 🐛 **Bug reports and fixes**
- ✨ **New features and enhancements**
- 📚 **Documentation improvements**
- 🧪 **Tests and examples**
- 🎨 **Performance optimizations**
- 🔌 **New adapter plugins**
- 🏗️ **Framework integrations**

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18.0.0
- npm ≥ 8.0.0
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/flightstream.git
   cd flightstream
   npm install
   ```

2. **Verify setup**
   ```bash
   npm run test:all  # Run all tests
   npm start         # Start example server
   npm test          # Run test client
   ```

### Project Structure

This project uses a monorepo structure organized by domain:

```
packages/
├── core/           # Core server and client engine
│   ├── server/     # @flightstream/core-server
│   └── client-engine/ # @flightstream/core-client-engine
├── adapters/       # Data source adapters
│   └── csv/        # @flightstream/adapters-csv
├── frameworks/     # Framework integrations
│   └── react/      # @flightstream/frameworks-react
├── utils/          # Utility libraries
│   ├── arrow/      # @flightstream/utils-arrow
│   └── streaming/  # @flightstream/utils-streaming
├── examples/       # Example applications
└── tools/          # Development tools
```

### Monorepo Management

Useful Lerna commands:
```bash
npm run list        # List all packages
npm run test:all    # Test all packages
npm run test:server # Test server and adapter packages
npm run test:client # Test client and framework packages
npm run lint        # Lint all packages
npm run build       # Build all packages
```

## 📝 Coding Standards & Conventions

### Naming Conventions
- **Package names**: `@flightstream/domain-name` (kebab-case)
- **Directories**: `packages/domain/package-name/` (kebab-case)
- **Source files**: `feature-name.js` (kebab-case)
- **Test files**: `feature-name.test.js`
- **Classes**: PascalCase (`FlightServer`)
- **Functions/Variables**: camelCase (`buildArrowTable`)

### Code Style
- Use ESLint configuration (`npm run lint`)
- Follow existing code patterns
- Keep functions small and focused
- Add JSDoc comments for public APIs
- Include usage examples in README files

### Testing
- Write unit tests for new functionality
- Test edge cases and error conditions
- Ensure good test coverage
- Include integration tests where appropriate

### License Headers
All source files must include the Apache 2.0 license header:

```javascript
/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
```

## 🔧 Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run test:all
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

### Pull Request Process

1. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**
   - **Title**: Use conventional commit format with scope
     - `feat(adapters): add PostgreSQL adapter`
     - `fix(core-server): handle connection timeout`
   
   - **Description**: Include what, why, and how
     - Brief description of changes
     - Type of change (bug fix, feature, docs)
     - Testing completed
     - Related issues (Closes #123)

3. **Pre-PR Checklist**
   - [ ] Code follows style guidelines
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] Error handling implemented

4. **Code Review**
   - **For Contributors**: Respond within 24-48 hours, keep changes focused
   - **For Reviewers**: Be constructive, check code quality and test coverage
   - **Merge Requirements**: All checks pass, at least one maintainer approval

## 🔌 Creating New Adapters

### Adapter Development

1. **Create package structure**
   ```bash
   mkdir packages/adapters/your-adapter
   cd packages/adapters/your-adapter
   ```

2. **Extend FlightServiceBase**
   ```javascript
   import { FlightServiceBase } from '@flightstream/core-server/flight-service-base';
   
   export class YourAdapter extends FlightServiceBase {
     async _initialize() {
       // Discover and register datasets
     }
     
     async _streamDataset(call, dataset) {
       // Stream data as Arrow record batches
     }
   }
   ```

3. **Add comprehensive tests, documentation, and examples**

### Adapter Guidelines
- Handle errors gracefully
- Support configurable batch sizes
- Implement proper schema inference
- Add comprehensive logging
- Include performance considerations

## 🏗️ Creating New Framework Integrations

### Framework Integration Development

1. **Create package structure**
   ```bash
   mkdir packages/frameworks/your-framework
   cd packages/frameworks/your-framework
   ```

2. **Follow the existing pattern**
   - Create plugin/middleware for the framework
   - Integrate with `@flightstream/core-server`
   - Provide easy-to-use APIs for developers
   - Include comprehensive examples

3. **Examples** (Planned)
   - **Fastify plugin**: `@flightstream/frameworks-fastify`
   - **Express middleware**: `@flightstream/frameworks-express`
   - **React hooks**: `@flightstream/frameworks-react`

### Framework Integration Guidelines
- Handle errors gracefully
- Support configuration options
- Add comprehensive logging
- Include performance considerations
- Provide TypeScript definitions where applicable

## 📋 Commit Message Guidelines

We use conventional commits for clear project history:

### Format
```
type(scope): description

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```bash
feat(adapters-csv): add support for custom delimiters
fix(core-server): handle gRPC connection errors gracefully
docs(readme): update installation instructions
test(utils-arrow): add tests for schema inference
feat(frameworks-fastify): add Fastify plugin integration
```

## 🐛 Reporting Issues

When reporting issues, please include:
- **Description**: Clear description of the problem
- **Reproduction**: Steps to reproduce the issue
- **Expected vs Actual behavior**: What should happen vs what happens
- **Environment**: Node.js version, OS, package versions
- **Code examples**: Minimal code to reproduce the issue

## 🚀 Feature Requests

For feature requests, please provide:
- **Use case**: Why is this feature needed?
- **Description**: Detailed description of the feature
- **Examples**: Code examples of how it would work
- **Alternatives**: Other solutions you've considered

## 🆘 Getting Help

If you need help:
- 📖 Check the [documentation](docs/)
- 💬 Start a [GitHub Discussion](https://github.com/ggauravr/flightstream/discussions)
- 🐛 Search existing [issues](https://github.com/ggauravr/flightstream/issues)
- 📧 Reach out to maintainers

## 🏆 Recognition

Contributors will be recognized in:
- Project README acknowledgments
- Release notes for significant contributions
- GitHub contributor graphs
- Package.json contributor lists

## 📜 Code of Conduct

This project follows the [Apache Software Foundation Code of Conduct](https://www.apache.org/foundation/policies/conduct.html). By participating, you agree to uphold this code.

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the Apache License, Version 2.0.

---

Thank you for contributing to the FlightStream Arrow Flight Server Framework! 🚀 