# Contributing to Arrow Flight Server Framework

Thank you for your interest in contributing to the Arrow Flight Server Framework! This guide will help you get started with contributing to this open-source project.

## 🎯 How to Contribute

We welcome contributions in many forms:
- 🐛 **Bug reports and fixes**
- ✨ **New features and enhancements**
- 📚 **Documentation improvements**
- 🧪 **Tests and examples**
- 🎨 **Performance optimizations**
- 🔌 **New adapter plugins**

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18.0.0
- npm ≥ 8.0.0
- Git

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/arrow-flight-server-js.git
   cd arrow-flight-server-js
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify setup**
   ```bash
   # Run tests
   npm test
   
   # Start example server
   npm start
   ```

### Monorepo Structure

This project uses a monorepo structure with multiple packages:

```
packages/
├── core/           # @arrow-flight/server
├── csv-adapter/    # @arrow-flight/csv-adapter  
├── utils/          # @arrow-flight/utils
└── examples/       # @arrow-flight/examples
```

Each package has its own:
- `package.json` with dependencies
- `src/` directory with source code
- `README.md` with package-specific docs

## 🔧 Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following our style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Run all tests
   npm test
   
   # Test specific package
   cd packages/core
   npm test
   
   # Lint code
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new adapter for PostgreSQL"
   ```

### Pull Request Process

1. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**
   - Use a descriptive title
   - Include a detailed description
   - Reference any related issues
   - Add tests and documentation

3. **Code Review**
   - Address reviewer feedback
   - Make requested changes
   - Ensure all checks pass

## 📝 Coding Standards

### Code Style
- Use ESLint configuration (runs with `npm run lint`)
- Follow existing code patterns
- Use meaningful variable and function names
- Keep functions small and focused

### Documentation
- Add JSDoc comments for all public APIs
- Include usage examples in README files
- Update relevant documentation files
- Add inline comments for complex logic

### Testing
- Write unit tests for new functionality
- Ensure good test coverage
- Test edge cases and error conditions
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

## 🔌 Creating New Adapters

We encourage community contributions of new data source adapters!

### Adapter Development

1. **Create package structure**
   ```bash
   mkdir packages/your-adapter
   cd packages/your-adapter
   ```

2. **Extend FlightServiceBase**
   ```javascript
   import { FlightServiceBase } from '@arrow-flight/server';
   
   export class YourAdapter extends FlightServiceBase {
     async _initialize() {
       // Discover and register datasets
     }
     
     async _streamDataset(call, dataset) {
       // Stream data as Arrow record batches
     }
   }
   ```

3. **Add comprehensive tests**
4. **Create documentation and examples**
5. **Submit as a pull request**

### Adapter Guidelines
- Follow consistent naming conventions
- Handle errors gracefully
- Support configurable batch sizes
- Implement proper schema inference
- Add comprehensive logging
- Include performance considerations

## 🐛 Reporting Issues

When reporting issues, please include:

- **Description**: Clear description of the problem
- **Reproduction**: Steps to reproduce the issue
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: Node.js version, OS, package versions
- **Code examples**: Minimal code to reproduce the issue

Use our issue templates for:
- 🐛 Bug reports
- ✨ Feature requests
- 📚 Documentation improvements
- ❓ Questions and support

## 🚀 Feature Requests

For feature requests, please provide:
- **Use case**: Why is this feature needed?
- **Description**: Detailed description of the feature
- **Examples**: Code examples of how it would work
- **Alternatives**: Other solutions you've considered

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
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```bash
feat(csv-adapter): add support for custom delimiters
fix(core): handle gRPC connection errors gracefully
docs(readme): update installation instructions
test(utils): add tests for schema inference
```

## 🔍 Code Review Process

### For Contributors
- Be responsive to feedback
- Make requested changes promptly
- Ask questions if feedback is unclear
- Keep changes focused and atomic

### For Reviewers
- Be constructive and helpful
- Explain reasoning behind suggestions
- Focus on code quality and maintainability
- Approve when ready, or request changes with clear guidance

## 🏆 Recognition

Contributors will be recognized in:
- Project README acknowledgments
- Release notes for significant contributions
- GitHub contributor graphs
- Package.json contributor lists

## 🆘 Getting Help

If you need help:
- 📖 Check the [documentation](docs/)
- 💬 Start a [GitHub Discussion](https://github.com/apache/arrow-flight-server-js/discussions)
- 🐛 Search existing [issues](https://github.com/apache/arrow-flight-server-js/issues)
- 📧 Reach out to maintainers

## 📜 Code of Conduct

This project follows the [Apache Software Foundation Code of Conduct](https://www.apache.org/foundation/policies/conduct.html). By participating, you agree to uphold this code.

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the Apache License, Version 2.0.

---

Thank you for contributing to the Arrow Flight Server Framework! 🚀 