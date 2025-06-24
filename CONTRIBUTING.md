# Contributing to Oracle Fusion MuleSoft Best Practices

We welcome contributions to improve and expand this collection of best practices! This document provides guidelines for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Reporting Issues](#reporting-issues)
- [Submitting Pull Requests](#submitting-pull-requests)
- [Coding Standards](#coding-standards)
- [Documentation Guidelines](#documentation-guidelines)
- [Testing Requirements](#testing-requirements)

## Code of Conduct

### Our Standards

We are committed to providing a welcoming and inclusive environment. Examples of behavior that contributes to a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Our Responsibilities

Project maintainers are responsible for clarifying standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

## How to Contribute

### Ways to Contribute

1. **Report bugs** and suggest features through GitHub Issues
2. **Improve documentation** by fixing typos, clarifying language, or adding examples
3. **Submit code improvements** via Pull Requests
4. **Share your integration patterns** and use cases
5. **Answer questions** in discussions and issues

### Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your contribution
4. Make your changes
5. Test your changes
6. Commit with clear, descriptive messages
7. Push to your fork
8. Submit a Pull Request

## Reporting Issues

### Before Submitting an Issue

1. Check the [FAQ](docs/FAQ.md) for common questions
2. Search existing issues to avoid duplicates
3. Verify the issue is reproducible

### Issue Template

When creating an issue, please include:

```markdown
**Description**
A clear and concise description of the issue.

**Environment**
- MuleSoft Runtime Version:
- Oracle Fusion Version/Module:
- Java Version:

**Steps to Reproduce**
1. Step one
2. Step two
3. ...

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Code Sample**
```xml
<!-- Relevant code snippet -->
```

**Additional Context**
Any other relevant information.
```

## Submitting Pull Requests

### Pull Request Process

1. **Create an issue first** to discuss the change
2. **Fork and clone** the repository
3. **Create a feature branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** following our coding standards
5. **Add tests** for new functionality
6. **Update documentation** as needed
7. **Commit your changes** with descriptive messages
8. **Push to your fork** and submit a Pull Request

### Pull Request Template

```markdown
## Description
Brief description of the changes.

## Related Issue
Fixes #(issue number)

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No hardcoded values or credentials
```

## Coding Standards

### MuleSoft Development Standards

1. **XML Formatting**
   - Use 4 spaces for indentation
   - Keep line length under 120 characters
   - Use meaningful flow and component names

2. **Naming Conventions**
   - Flows: `verb-resource-flow` (e.g., `get-employees-flow`)
   - Variables: `camelCase` (e.g., `employeeId`)
   - Properties: `dot.notation` (e.g., `oracle.host`)

3. **DataWeave Standards**
   - Use DataWeave 2.0
   - Include input/output comments
   - Handle null values appropriately
   - Use meaningful variable names

4. **Error Handling**
   - Always include error handlers
   - Use appropriate error types
   - Log errors with correlation IDs
   - Return meaningful error messages

### Example Code Style

```xml
<flow name="get-employee-by-id-flow">
    <http:listener config-ref="HTTP_Listener_config" 
                   path="/api/v1/employees/{employeeId}" 
                   allowedMethods="GET">
        <http:response statusCode="#[vars.httpStatus default 200]"/>
    </http:listener>
    
    <ee:transform doc:name="Extract Parameters">
        <ee:variables>
            <ee:set-variable variableName="employeeId">
                <![CDATA[%dw 2.0
                output application/java
                ---
                attributes.uriParams.employeeId]]>
            </ee:set-variable>
        </ee:variables>
    </ee:transform>
    
    <flow-ref name="validate-and-fetch-employee" doc:name="Process Request"/>
    
    <error-handler ref="global-error-handler"/>
</flow>
```

## Documentation Guidelines

### Writing Style

1. Use clear, concise language
2. Provide examples for complex concepts
3. Include code snippets where helpful
4. Keep paragraphs short and focused
5. Use proper markdown formatting

### Documentation Structure

1. **README files** should include:
   - Overview
   - Prerequisites
   - Installation steps
   - Usage examples
   - Troubleshooting

2. **Code comments** should explain:
   - Complex logic
   - Business rules
   - Non-obvious implementations
   - External dependencies

3. **API documentation** should include:
   - Endpoint descriptions
   - Request/response examples
   - Error scenarios
   - Authentication requirements

## Testing Requirements

### Unit Tests

All new code should include MUnit tests:

```xml
<munit:test name="test-employee-transformation">
    <munit:behavior>
        <munit:set-payload value='#[readUrl("classpath://test-data/input.json")]'/>
    </munit:behavior>
    
    <munit:execution>
        <flow-ref name="transform-employee-data"/>
    </munit:execution>
    
    <munit:validation>
        <munit-tools:assert-equals 
            actual="#[payload.employeeId]" 
            expected="12345"/>
    </munit:validation>
</munit:test>
```

### Test Coverage

- Aim for minimum 80% code coverage
- Test happy path and error scenarios
- Include edge cases
- Test data transformations thoroughly

### Integration Tests

When applicable, provide:
- Mock responses for external systems
- Test data sets
- Performance test scenarios
- Security test cases

## Review Process

### What We Look For

1. **Code Quality**
   - Follows coding standards
   - No code duplication
   - Efficient implementations
   - Proper error handling

2. **Documentation**
   - Clear and complete
   - Examples provided
   - Comments where needed

3. **Testing**
   - Adequate test coverage
   - Tests pass consistently
   - Edge cases covered

4. **Security**
   - No hardcoded credentials
   - Secure coding practices
   - Proper authentication

### Review Timeline

- Initial review within 5 business days
- Address feedback promptly
- Follow-up reviews within 3 business days

## Questions?

If you have questions about contributing:

1. Check existing discussions
2. Create a new discussion
3. Reach out to maintainers

Thank you for contributing to make Oracle Fusion MuleSoft integrations better for everyone!