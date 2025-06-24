const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'mock-oracle-fusion-secret-key';

// Load test data
const vendorsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/vendors.json'), 'utf8'));
const invoicesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/invoices.json'), 'utf8'));
const reportsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/reports.json'), 'utf8'));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// OAuth 2.0 Token Endpoint
app.post('/oauth/token', (req, res) => {
  const { grant_type, username, password, client_id, client_secret } = req.body;

  // Mock validation
  if (grant_type === 'password' && username === 'testuser' && password === 'testpass') {
    const token = jwt.sign({ username, client_id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'read write'
    });
  } else if (grant_type === 'client_credentials' && client_id === 'test_client' && client_secret === 'test_secret') {
    const token = jwt.sign({ client_id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'read write'
    });
  } else {
    res.status(400).json({ error: 'Invalid credentials' });
  }
});

// Vendors API Endpoints
app.get('/fscmRestApi/resources/11.13.18.05/suppliers', authenticateToken, (req, res) => {
  const { limit = 25, offset = 0, q } = req.query;
  let vendors = [...vendorsData.vendors];

  // Apply search filter if provided
  if (q) {
    // Simple search implementation
    const searchTerm = q.toLowerCase();
    vendors = vendors.filter(v => 
      v.VendorName.toLowerCase().includes(searchTerm) ||
      v.VendorNumber.toLowerCase().includes(searchTerm)
    );
  }

  // Apply pagination
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const paginatedVendors = vendors.slice(startIndex, endIndex);

  res.json({
    items: paginatedVendors,
    count: paginatedVendors.length,
    hasMore: endIndex < vendors.length,
    limit: parseInt(limit),
    offset: parseInt(offset),
    links: [
      {
        rel: 'self',
        href: `/fscmRestApi/resources/11.13.18.05/suppliers?limit=${limit}&offset=${offset}`
      }
    ]
  });
});

app.get('/fscmRestApi/resources/11.13.18.05/suppliers/:vendorId', authenticateToken, (req, res) => {
  const vendor = vendorsData.vendors.find(v => v.VendorId === parseInt(req.params.vendorId));
  
  if (vendor) {
    res.json(vendor);
  } else {
    res.status(404).json({ error: 'Vendor not found' });
  }
});

app.post('/fscmRestApi/resources/11.13.18.05/suppliers', authenticateToken, (req, res) => {
  const newVendor = {
    VendorId: 300000001428500 + vendorsData.vendors.length,
    ...req.body,
    CreatedBy: req.user.username || 'SYSTEM_INTEGRATION',
    CreationDate: new Date().toISOString(),
    LastUpdatedBy: req.user.username || 'SYSTEM_INTEGRATION',
    LastUpdateDate: new Date().toISOString()
  };

  vendorsData.vendors.push(newVendor);
  res.status(201).json(newVendor);
});

app.patch('/fscmRestApi/resources/11.13.18.05/suppliers/:vendorId', authenticateToken, (req, res) => {
  const vendorIndex = vendorsData.vendors.findIndex(v => v.VendorId === parseInt(req.params.vendorId));
  
  if (vendorIndex !== -1) {
    vendorsData.vendors[vendorIndex] = {
      ...vendorsData.vendors[vendorIndex],
      ...req.body,
      LastUpdatedBy: req.user.username || 'SYSTEM_INTEGRATION',
      LastUpdateDate: new Date().toISOString()
    };
    res.json(vendorsData.vendors[vendorIndex]);
  } else {
    res.status(404).json({ error: 'Vendor not found' });
  }
});

// Invoices API Endpoints
app.get('/fscmRestApi/resources/11.13.18.05/invoices', authenticateToken, (req, res) => {
  const { limit = 25, offset = 0, q, expand } = req.query;
  let invoices = [...invoicesData.invoices];

  // Apply search filter if provided
  if (q) {
    const searchTerm = q.toLowerCase();
    invoices = invoices.filter(i => 
      i.InvoiceNumber.toLowerCase().includes(searchTerm) ||
      i.VendorName.toLowerCase().includes(searchTerm)
    );
  }

  // Apply pagination
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const paginatedInvoices = invoices.slice(startIndex, endIndex);

  // Handle expand parameter
  if (!expand || !expand.includes('Lines')) {
    paginatedInvoices.forEach(invoice => {
      delete invoice.Lines;
      delete invoice.Holds;
      delete invoice.Attachments;
    });
  }

  res.json({
    items: paginatedInvoices,
    count: paginatedInvoices.length,
    hasMore: endIndex < invoices.length,
    limit: parseInt(limit),
    offset: parseInt(offset),
    links: [
      {
        rel: 'self',
        href: `/fscmRestApi/resources/11.13.18.05/invoices?limit=${limit}&offset=${offset}`
      }
    ]
  });
});

app.get('/fscmRestApi/resources/11.13.18.05/invoices/:invoiceId', authenticateToken, (req, res) => {
  const invoice = invoicesData.invoices.find(i => i.InvoiceId === parseInt(req.params.invoiceId));
  
  if (invoice) {
    res.json(invoice);
  } else {
    res.status(404).json({ error: 'Invoice not found' });
  }
});

app.post('/fscmRestApi/resources/11.13.18.05/invoices', authenticateToken, (req, res) => {
  const newInvoice = {
    InvoiceId: 300000001429100 + invoicesData.invoices.length,
    ...req.body,
    CreatedBy: req.user.username || 'SYSTEM_INTEGRATION',
    CreationDate: new Date().toISOString(),
    LastUpdatedBy: req.user.username || 'SYSTEM_INTEGRATION',
    LastUpdateDate: new Date().toISOString(),
    ApprovalStatus: 'REQUIRES_APPROVAL',
    ValidationStatus: 'NEEDS_VALIDATION',
    AccountingStatus: 'NEEDS_ACCOUNTING',
    PostedFlag: false,
    AmountPaid: 0.00
  };

  invoicesData.invoices.push(newInvoice);
  res.status(201).json(newInvoice);
});

app.patch('/fscmRestApi/resources/11.13.18.05/invoices/:invoiceId', authenticateToken, (req, res) => {
  const invoiceIndex = invoicesData.invoices.findIndex(i => i.InvoiceId === parseInt(req.params.invoiceId));
  
  if (invoiceIndex !== -1) {
    invoicesData.invoices[invoiceIndex] = {
      ...invoicesData.invoices[invoiceIndex],
      ...req.body,
      LastUpdatedBy: req.user.username || 'SYSTEM_INTEGRATION',
      LastUpdateDate: new Date().toISOString()
    };
    res.json(invoicesData.invoices[invoiceIndex]);
  } else {
    res.status(404).json({ error: 'Invoice not found' });
  }
});

// Invoice Actions
app.post('/fscmRestApi/resources/11.13.18.05/invoices/:invoiceId/action/validate', authenticateToken, (req, res) => {
  const invoice = invoicesData.invoices.find(i => i.InvoiceId === parseInt(req.params.invoiceId));
  
  if (invoice) {
    invoice.ValidationStatus = 'VALIDATED';
    invoice.LastUpdatedBy = req.user.username || 'SYSTEM_INTEGRATION';
    invoice.LastUpdateDate = new Date().toISOString();
    res.json({ 
      status: 'success', 
      message: 'Invoice validated successfully',
      invoice: invoice
    });
  } else {
    res.status(404).json({ error: 'Invoice not found' });
  }
});

app.post('/fscmRestApi/resources/11.13.18.05/invoices/:invoiceId/action/approve', authenticateToken, (req, res) => {
  const invoice = invoicesData.invoices.find(i => i.InvoiceId === parseInt(req.params.invoiceId));
  
  if (invoice) {
    invoice.ApprovalStatus = 'APPROVED';
    invoice.LastUpdatedBy = req.user.username || 'SYSTEM_INTEGRATION';
    invoice.LastUpdateDate = new Date().toISOString();
    res.json({ 
      status: 'success', 
      message: 'Invoice approved successfully',
      invoice: invoice
    });
  } else {
    res.status(404).json({ error: 'Invoice not found' });
  }
});

// Purchase Orders API Endpoints
app.get('/fscmRestApi/resources/11.13.18.05/purchaseOrders', authenticateToken, (req, res) => {
  // Mock purchase orders response
  res.json({
    items: [
      {
        HeaderId: 300000001430001,
        OrderNumber: "PO-2024-0123",
        DocumentStatus: "OPEN",
        Supplier: "Global Tech Solutions Ltd",
        SupplierId: 300000001428298,
        OrderDate: "2024-02-15",
        Total: 14500.00,
        Currency: "USD"
      },
      {
        HeaderId: 300000001430002,
        OrderNumber: "PO-2024-0215",
        DocumentStatus: "CLOSED",
        Supplier: "Office Supplies Plus Inc",
        SupplierId: 300000001428303,
        OrderDate: "2024-03-01",
        Total: 3350.00,
        Currency: "USD"
      }
    ],
    count: 2,
    hasMore: false,
    limit: 25,
    offset: 0
  });
});

// EPM Reports API Endpoints
app.get('/xmlpserver/services/v2/ReportService', authenticateToken, (req, res) => {
  // Mock EPM report list
  res.json({
    reports: reportsData.reports.map(r => ({
      reportId: r.reportId,
      reportName: r.reportName,
      reportType: r.reportType,
      status: r.status
    }))
  });
});

app.post('/xmlpserver/services/v2/ReportService/runReport', authenticateToken, (req, res) => {
  const { reportPath, reportParameters } = req.body;
  
  // Find matching report based on parameters
  const report = reportsData.reports.find(r => 
    r.reportType === reportParameters.reportType || 
    r.reportName === reportParameters.reportName
  );

  if (report) {
    res.json({
      reportId: report.reportId,
      status: 'RUNNING',
      message: 'Report generation initiated',
      estimatedTime: 30
    });
  } else {
    res.status(404).json({ error: 'Report not found' });
  }
});

app.get('/xmlpserver/services/v2/ReportService/getReportData/:reportId', authenticateToken, (req, res) => {
  const report = reportsData.reports.find(r => r.reportId === req.params.reportId);
  
  if (report) {
    res.json(report);
  } else {
    res.status(404).json({ error: 'Report not found' });
  }
});

// OTBI (Oracle Transactional Business Intelligence) Endpoints
app.post('/xmlpserver/services/v2/CatalogService', authenticateToken, (req, res) => {
  // Mock OTBI catalog response
  res.json({
    folders: [
      {
        path: "/shared/Finance/Payables",
        name: "Payables",
        items: [
          "AP Aging Report",
          "Invoice Register",
          "Payment Register"
        ]
      },
      {
        path: "/shared/Finance/GeneralLedger",
        name: "General Ledger",
        items: [
          "Trial Balance",
          "Account Analysis",
          "Journal Report"
        ]
      }
    ]
  });
});

// Bulk Data API Endpoints
app.post('/fscmRestApi/resources/11.13.18.05/invoices/bulkProcess', authenticateToken, (req, res) => {
  const { invoices } = req.body;
  const results = [];

  invoices.forEach((invoice, index) => {
    const newInvoice = {
      InvoiceId: 300000001429200 + index,
      ...invoice,
      CreatedBy: req.user.username || 'SYSTEM_INTEGRATION',
      CreationDate: new Date().toISOString(),
      LastUpdatedBy: req.user.username || 'SYSTEM_INTEGRATION',
      LastUpdateDate: new Date().toISOString(),
      ApprovalStatus: 'REQUIRES_APPROVAL',
      ValidationStatus: 'NEEDS_VALIDATION',
      AccountingStatus: 'NEEDS_ACCOUNTING',
      PostedFlag: false,
      AmountPaid: 0.00
    };
    
    invoicesData.invoices.push(newInvoice);
    results.push({
      status: 'success',
      invoice: newInvoice
    });
  });

  res.status(201).json({
    processId: `BULK-${Date.now()}`,
    totalRecords: invoices.length,
    successCount: results.length,
    failureCount: 0,
    results: results
  });
});

// ESS (Enterprise Scheduler Service) Job Submission
app.post('/fscmRestApi/resources/11.13.18.05/erpintegrations', authenticateToken, (req, res) => {
  const { jobName, parameters } = req.body;
  
  res.status(202).json({
    requestId: Math.floor(Math.random() * 1000000),
    jobName: jobName,
    status: 'SUBMITTED',
    submittedBy: req.user.username || 'SYSTEM_INTEGRATION',
    submissionTime: new Date().toISOString(),
    parameters: parameters
  });
});

// Check ESS Job Status
app.get('/fscmRestApi/resources/11.13.18.05/erpintegrations/:requestId', authenticateToken, (req, res) => {
  // Mock job status response
  res.json({
    requestId: req.params.requestId,
    status: 'COMPLETED',
    completionTime: new Date().toISOString(),
    outputFiles: [
      {
        fileName: 'output.csv',
        fileSize: 125000,
        downloadUrl: `/download/${req.params.requestId}/output.csv`
      }
    ]
  });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      oauth: '/oauth/token',
      suppliers: '/fscmRestApi/resources/11.13.18.05/suppliers',
      invoices: '/fscmRestApi/resources/11.13.18.05/invoices',
      purchaseOrders: '/fscmRestApi/resources/11.13.18.05/purchaseOrders',
      reports: '/xmlpserver/services/v2/ReportService',
      erpIntegrations: '/fscmRestApi/resources/11.13.18.05/erpintegrations'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.url} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Oracle Fusion Mock Server running on http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log('\nAuthentication credentials:');
  console.log('  Password Grant: username=testuser, password=testpass');
  console.log('  Client Credentials: client_id=test_client, client_secret=test_secret');
});

module.exports = app;