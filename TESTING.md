# Testing Guide for Oracle Fusion + MuleSoft Integration

## Overview

This document provides comprehensive testing guidelines for implementing and validating the Oracle Fusion Cloud integration patterns with MuleSoft. It is designed for independent testers, QA engineers, and developers who need to verify the integration architecture and ensure robust connectivity between Oracle Fusion (ERP/EPM) and MuleSoft.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test Environment Setup](#test-environment-setup)
3. [Test Categories](#test-categories)
4. [Test Scenarios](#test-scenarios)
5. [Mock Services](#mock-services)
6. [Test Data](#test-data)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- **MuleSoft Anypoint Studio** 7.12+ or Anypoint Platform access
- **Postman** or similar API testing tool
- **SoapUI** for SOAP/BIP testing
- **JMeter** for performance testing
- **Git** for version control

### Access Requirements
- Oracle Fusion Cloud test instance (ERP/EPM)
- Azure AD test tenant (for authentication flows)
- MuleSoft CloudHub or on-premise runtime
- Test certificates for JWT/SAML

### Knowledge Requirements
- Understanding of RESTful APIs and SOAP services
- Basic knowledge of OAuth2, SAML, and JWT
- Familiarity with DataWeave 2.0
- Oracle Fusion API documentation

---

## Test Environment Setup

### 1. Clone the Repository
```bash
git clone https://github.com/msaleme/oracle-fusion-mulesoft-best-practices.git
cd oracle-fusion-mulesoft-best-practices
```

### 2. Configure Test Properties

Create a `test-config.yaml` file in the project root:

```yaml
# Test Environment Configuration
oracle:
  fusion:
    baseUrl: "https://test-instance.oraclecloud.com"
    erpApiPath: "/fscmRestApi/resources/11.13.18.05"
    epmApiPath: "/xmlpserver/services/v2"
    
auth:
  azure:
    tenantId: "your-test-tenant-id"
    clientId: "your-test-client-id"
    clientSecret: "${secure::azureClientSecret}"
    scope: "https://test-instance.oraclecloud.com/.default"
    
  saml:
    issuer: "test-saml-issuer"
    audienceUri: "https://test-instance.oraclecloud.com"
    
test:
  timeout: 30000
  retryAttempts: 3
  mockServerUrl: "http://localhost:8081"
```

### 3. Install Dependencies

```bash
# For MuleSoft project
mvn clean install -DskipTests

# For mock services
npm install -g json-server
```

---

## Test Categories

### 1. Unit Tests
- DataWeave transformation logic
- Error mapping functions
- Token caching mechanisms
- Business validation rules

### 2. Integration Tests
- Oracle Fusion REST API connectivity
- BIP report retrieval via SOAP
- Authentication flow (SAML → JWT → OAuth2)
- End-to-end API flows

### 3. Contract Tests
- RAML specification validation
- Request/Response schema validation
- API versioning compatibility

### 4. Non-Functional Tests
- Performance benchmarks
- Security vulnerability scans
- Load testing
- Failover scenarios

---

## Test Scenarios

### Authentication Flow Testing

#### Test Case: SAML to OAuth2 Token Exchange
```gherkin
Feature: Authentication Token Management
  
  Scenario: Successfully obtain OAuth2 token via SAML assertion
    Given I have valid Azure AD credentials
    When I request a SAML assertion from Azure AD
    And I exchange the SAML assertion for a JWT at Oracle Fusion
    And I request an OAuth2 access token using the JWT
    Then I should receive a valid OAuth2 token
    And the token should be cached for subsequent requests
    
  Scenario: Handle expired token gracefully
    Given I have an expired OAuth2 token
    When I make an API request to Oracle Fusion
    Then the system should automatically refresh the token
    And retry the original request
    And return the expected response
```

### System API Testing

#### Test Case: ERP Vendor Data Retrieval
```yaml
test_name: "Get ERP Vendors"
endpoint: "/api/system/erp/vendors"
method: "GET"
headers:
  client_id: "test-client-id"
  client_secret: "test-client-secret"
expected_response:
  status: 200
  schema: "vendors-schema.json"
  fields:
    - vendorId
    - vendorName
    - vendorType
    - status
validation:
  - response_time < 2000ms
  - all vendors have required fields
  - vendor status in ['ACTIVE', 'INACTIVE']
```

#### Test Case: EPM Report Generation
```yaml
test_name: "Generate Forecast Report"
endpoint: "/api/system/epm/forecastReport"
method: "POST"
payload:
  reportPath: "/Custom/Financial/ForecastReport.xdo"
  parameters:
    period: "2024-Q1"
    department: "FINANCE"
  format: "JSON"
expected_response:
  status: 200
  content_type: "application/json"
  validation:
    - report data is not empty
    - all numeric values are valid
    - date formats are ISO 8601
```

### Process API Testing

#### Test Case: Invoice Creation Workflow
```javascript
// Test implementation using MUnit
describe('Invoice Creation Process', () => {
  it('should validate vendor before creating invoice', async () => {
    // Arrange
    const mockVendor = {
      vendorId: "V12345",
      status: "ACTIVE",
      paymentTerms: "NET30"
    };
    
    const invoiceRequest = {
      vendorId: "V12345",
      amount: 5000.00,
      currency: "USD",
      dueDate: "2024-02-15"
    };
    
    // Act
    const response = await processApi.createInvoice(invoiceRequest);
    
    // Assert
    expect(response.status).toBe(201);
    expect(response.data.invoiceNumber).toMatch(/^INV-\d{8}$/);
    expect(response.data.approvalStatus).toBe('PENDING');
  });
  
  it('should reject invoice for inactive vendor', async () => {
    // Test negative scenario
  });
});
```

### Experience API Testing

#### Test Case: Mobile-Optimized Response
```yaml
test_name: "Mobile Vendor Status API"
endpoint: "/api/experience/mobile/vendor-status"
method: "GET"
parameters:
  vendorId: "V12345"
  fields: "basic"
headers:
  User-Agent: "MobileApp/1.0"
expected_response:
  status: 200
  max_size: 50KB
  fields_present:
    - vendorName
    - status
    - lastPaymentDate
  fields_excluded:
    - internalNotes
    - auditTrail
    - detailedFinancials
```

---

## Mock Services

### Oracle Fusion Mock Server

Create `mock-server/oracle-fusion-mock.js`:

```javascript
const express = require('express');
const app = express();

// Mock OAuth2 token endpoint
app.post('/oauth2/token', (req, res) => {
  res.json({
    access_token: 'mock-oauth2-token-' + Date.now(),
    token_type: 'Bearer',
    expires_in: 3600
  });
});

// Mock ERP Vendors endpoint
app.get('/fscmRestApi/resources/11.13.18.05/suppliers', (req, res) => {
  res.json({
    items: [
      {
        SupplierId: 300000001,
        SupplierNumber: "V12345",
        SupplierName: "Test Vendor Corp",
        SupplierType: "STANDARD",
        Status: "ACTIVE"
      }
    ],
    count: 1,
    hasMore: false
  });
});

// Mock BIP Report Service
app.post('/xmlpserver/services/v2/ReportService', (req, res) => {
  const soapResponse = `
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <runReportResponse>
          <reportBytes>base64EncodedReportData</reportBytes>
          <reportContentType>application/json</reportContentType>
        </runReportResponse>
      </soap:Body>
    </soap:Envelope>
  `;
  res.set('Content-Type', 'text/xml');
  res.send(soapResponse);
});

app.listen(8082, () => {
  console.log('Oracle Fusion Mock Server running on port 8082');
});
```

### Running Mock Services

```bash
# Start the mock server
node mock-server/oracle-fusion-mock.js

# Configure MuleSoft to use mock endpoints
export ORACLE_FUSION_BASE_URL=http://localhost:8082
```

---

## Test Data

### Sample Test Data Sets

#### Vendors Test Data
```json
{
  "testVendors": [
    {
      "vendorId": "V12345",
      "vendorName": "Acme Corporation",
      "vendorType": "STANDARD",
      "status": "ACTIVE",
      "paymentTerms": "NET30",
      "taxId": "12-3456789"
    },
    {
      "vendorId": "V67890",
      "vendorName": "Global Supplies Inc",
      "vendorType": "EMPLOYEE",
      "status": "INACTIVE",
      "paymentTerms": "IMMEDIATE",
      "taxId": "98-7654321"
    }
  ]
}
```

#### Invoice Test Data
```json
{
  "testInvoices": [
    {
      "invoiceNumber": "INV-20240101",
      "vendorId": "V12345",
      "invoiceAmount": 5000.00,
      "currency": "USD",
      "invoiceDate": "2024-01-15",
      "dueDate": "2024-02-15",
      "lineItems": [
        {
          "description": "Professional Services",
          "quantity": 40,
          "unitPrice": 125.00,
          "amount": 5000.00
        }
      ]
    }
  ]
}
```

---

## Performance Testing

### JMeter Test Plan

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2">
  <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Oracle Fusion Integration Load Test">
    <elementProp name="TestPlan.user_defined_variables" elementType="Arguments">
      <collectionProp name="Arguments.arguments">
        <elementProp name="BASE_URL" elementType="Argument">
          <stringProp name="Argument.name">BASE_URL</stringProp>
          <stringProp name="Argument.value">http://localhost:8081</stringProp>
        </elementProp>
      </collectionProp>
    </elementProp>
    
    <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="API Load Test">
      <intProp name="ThreadGroup.num_threads">50</intProp>
      <intProp name="ThreadGroup.ramp_time">30</intProp>
      <longProp name="ThreadGroup.duration">300</longProp>
      
      <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Get Vendors">
        <stringProp name="HTTPSampler.path">/api/system/erp/vendors</stringProp>
        <stringProp name="HTTPSampler.method">GET</stringProp>
      </HTTPSamplerProxy>
      
      <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Response Code Assertion">
        <collectionProp name="Asserion.test_strings">
          <stringProp>200</stringProp>
        </collectionProp>
        <intProp name="Assertion.test_type">8</intProp>
      </ResponseAssertion>
    </ThreadGroup>
  </TestPlan>
</jmeterTestPlan>
```

### Performance Benchmarks

| API Endpoint | Expected Response Time | Throughput | Concurrent Users |
|--------------|----------------------|------------|------------------|
| GET /erp/vendors | < 500ms | 100 req/s | 50 |
| POST /erp/invoices | < 1000ms | 50 req/s | 25 |
| GET /epm/reports | < 3000ms | 20 req/s | 10 |
| POST /token/refresh | < 200ms | 200 req/s | 100 |

---

## Security Testing

### OWASP Top 10 Checklist

- [ ] **Injection**: Test SQL/NoSQL/LDAP injection in all input fields
- [ ] **Broken Authentication**: Verify token expiration and session management
- [ ] **Sensitive Data Exposure**: Ensure PII is masked in logs and responses
- [ ] **XML External Entities**: Test XXE vulnerabilities in SOAP endpoints
- [ ] **Broken Access Control**: Verify role-based access restrictions
- [ ] **Security Misconfiguration**: Check for default credentials and endpoints
- [ ] **Cross-Site Scripting**: Validate all user inputs are sanitized
- [ ] **Insecure Deserialization**: Test object deserialization vulnerabilities
- [ ] **Using Components with Known Vulnerabilities**: Run dependency checks
- [ ] **Insufficient Logging**: Verify security events are logged properly

### Security Test Cases

```bash
# Test for SQL Injection
curl -X GET "http://localhost:8081/api/system/erp/vendors?vendorId=V12345' OR '1'='1"

# Test for missing authentication
curl -X GET "http://localhost:8081/api/system/erp/vendors" -H "client_id: " 

# Test for JWT manipulation
curl -X GET "http://localhost:8081/api/system/erp/vendors" \
  -H "Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ0ZXN0In0."
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Token Refresh Loop
```yaml
symptom: "API calls result in continuous 401 errors despite token refresh"
possible_causes:
  - Clock skew between MuleSoft and Oracle Fusion
  - Incorrect token cache configuration
  - Invalid client credentials
solutions:
  - Sync system clocks using NTP
  - Verify ObjectStore configuration
  - Regenerate client credentials in Oracle Fusion
```

#### Issue: BIP Report Timeout
```yaml
symptom: "BIP report requests timeout after 30 seconds"
possible_causes:
  - Large report data set
  - Synchronous processing of reports
  - Network latency
solutions:
  - Implement asynchronous report processing
  - Use report bursting for large data sets
  - Increase timeout values in HTTP connector
```

#### Issue: DataWeave Transformation Errors
```yaml
symptom: "DataWeave script fails with 'Unable to coerce' error"
possible_causes:
  - Null values in Oracle response
  - Date format mismatches
  - Numeric type conflicts
solutions:
  - Add null safety checks: payload.field default ""
  - Use explicit date formatting: as DateTime {format: "yyyy-MM-dd"}
  - Cast numeric values: payload.amount as Number
```

### Debug Configuration

Add to your `log4j2.xml`:

```xml
<Loggers>
  <AsyncLogger name="org.mule.extension.http" level="DEBUG"/>
  <AsyncLogger name="org.mule.extension.oauth" level="DEBUG"/>
  <AsyncLogger name="com.mulesoft.connectors.oracle" level="TRACE"/>
  <AsyncLogger name="org.mule.runtime.core.internal.processor" level="DEBUG"/>
</Loggers>
```

---

## Test Execution Commands

```bash
# Run unit tests
mvn test

# Run integration tests
mvn verify -Pintegration-tests

# Run specific test suite
mvn test -Dtest=OracleFusionAuthenticationTest

# Generate test report
mvn surefire-report:report

# Run with coverage
mvn clean test jacoco:report
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Integration Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 11
      uses: actions/setup-java@v3
      with:
        java-version: '11'
        
    - name: Start Mock Services
      run: |
        npm install
        npm run mock-server &
        
    - name: Run Tests
      run: mvn clean verify
      
    - name: Upload Test Results
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: target/surefire-reports/
```

---

## Contact

For testing support and questions:
- Create an issue in the [GitHub repository](https://github.com/msaleme/oracle-fusion-mulesoft-best-practices/issues)
- Review the [FAQ document](docs/FAQ.md)
- Contact the integration team at [your-email@example.com]