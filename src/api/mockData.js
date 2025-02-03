// Mock data for the API based on the XML structure
export const datastoreIds = [
  {
    id: "com.seeburger.sil.hsbc.HSBCUserAction",
    creationTime: "1589764855207",
    expirationTime: "-1",
    synchronous: true,
    className: "com.seeburger.sil.element.impl.SilElementDnaImpl",
    datastoreId: "SilElementDna",
    priority: "-1",
    publishActionType: "OVERWRITE",
    classType: "ELEMENTDNA"
  },
  {
    id: "com.seeburger.sil.hsbc.HSBCTestActivity",
    creationTime: "1637759242152",
    expirationTime: "-1",
    synchronous: true,
    className: "com.seeburger.sil.element.impl.SilElementDnaImpl",
    datastoreId: "SilElementDna",
    priority: "-1",
    publishActionType: "OVERWRITE",
    classType: "ELEMENTDNA"
  },
  {
    id: "com.seeburger.sil.hsbc.PaymentProcessing",
    creationTime: "1673459872000",
    expirationTime: "-1",
    synchronous: true,
    className: "com.seeburger.sil.element.impl.SilElementDnaImpl",
    datastoreId: "PaymentProcessing",
    priority: "1",
    publishActionType: "APPEND",
    classType: "ELEMENTDNA"
  },
  {
    id: "com.seeburger.sil.hsbc.TransactionMonitor",
    creationTime: "1668234567000",
    expirationTime: "-1",
    synchronous: false,
    className: "com.seeburger.sil.element.impl.SilElementDnaImpl",
    datastoreId: "TransactionMonitor",
    priority: "2",
    publishActionType: "UPDATE",
    classType: "ELEMENTDNA"
  },
  {
    id: "com.seeburger.sil.hsbc.AuditLogger",
    creationTime: "1678901234000",
    expirationTime: "1710437234000",
    synchronous: true,
    className: "com.seeburger.sil.element.impl.SilElementDnaImpl",
    datastoreId: "AuditLogger",
    priority: "0",
    publishActionType: "OVERWRITE",
    classType: "ELEMENTDNA"
  },
  {
    id: "com.seeburger.sil.hsbc.ReportGenerator",
    creationTime: "1682345678000",
    expirationTime: "-1",
    synchronous: true,
    className: "com.seeburger.sil.element.impl.SilElementDnaImpl",
    datastoreId: "ReportGenerator",
    priority: "-1",
    publishActionType: "APPEND",
    classType: "ELEMENTDNA"
  }
];

export const datastoreFiles = {
  'com.seeburger.sil.hsbc.HSBCUserAction': {
    datastoreId: 'com.seeburger.sil.hsbc.HSBCUserAction',
    files: [
      {
        clientId: "2",
        componentGroup: "PE",
        componentInstance: "DEV-PE-PE1",
        componentMachineName: "hk125090725.hc.cloud.hk.hsbc",
        componentSystem: "DEV",
        contextId: "03967c81-b162-11ef-b4a4-60f182b29985",
        creator: "BIS",
        elementDigest: "base64-encoded-digest",
        env: "300",
        groupId: "03967f70-b162-11ef-84a4-60f182b29985",
        handledByServer: "hk125090650.hc.cloud.hk.hsbc",
        status: "FAILED",
        fileName: "NCConnect.BIS.1.70005AN0.45037753.202208070915",
        fileType: "FUINPP",
        clientConnection: "NC-HSBC_37753_LS300_EXT",
        clientName: "HSBC_LOCALISATION_TESTING",
        controlSum: "0.01",
        direction: "INBOUND",
        fileId: "1AEBFE31C9C44C5899",
        processingEndDate: "173522206238"
      },
      {
        fileId: "2AEBFE31C9C44C5899",
        fileName: "SimpleFile.BIS.45037754.202208070916",
        fileType: "SIMPLE",
        status: "SUCCESS",
        clientName: "HSBC_TEST",
        direction: "OUTBOUND",
        processingEndDate: "173522206240"
      },
      {
        fileId: "3AEBFE31C9C44C5899",
        fileName: "MinimalFile.BIS.45037755.202208070917",
        fileType: "MINIMAL",
        status: "SUCCESS",
        direction: "INBOUND"
      },
      ...Array.from({ length: 20 }, (_, i) => ({
        fileId: `TEST${i + 4}AEBFE31C9C44C5899`,
        fileName: `TestFile${i + 1}.BIS.${45037756 + i}.202208070918`,
        fileType: i % 2 === 0 ? 'TYPE_A' : 'TYPE_B',
        status: i % 3 === 0 ? 'FAILED' : 'SUCCESS',
        clientName: `TEST_CLIENT_${i + 1}`,
        direction: i % 2 === 0 ? 'INBOUND' : 'OUTBOUND',
        processingEndDate: (173522206241 + i).toString()
      }))
    ]
  },
  'com.seeburger.sil.hsbc.HSBCTestActivity': {
    datastoreId: 'com.seeburger.sil.hsbc.HSBCTestActivity',
    files: [
      {
        fileId: "4AEBFE31C9C44C5899",
        fileName: "TestActivity.BIS.45037757.202208070919",
        status: "SUCCESS",
        direction: "INBOUND"
      },
      {
        fileId: "5AEBFE31C9C44C5899",
        fileName: "Activity.BIS.45037758.202208070920",
        fileType: "ACTIVITY",
        status: "FAILED",
        clientName: "HSBC_ACTIVITY",
        direction: "OUTBOUND",
        processingEndDate: "173522206242"
      }
    ]
  },
  'com.seeburger.sil.hsbc.PaymentProcessing': {
    datastoreId: 'com.seeburger.sil.hsbc.PaymentProcessing',
    files: [
      {
        fileId: "PAY001",
        fileName: "Payment_20240315.xml",
        fileType: "PAYMENT",
        status: "SUCCESS",
        clientName: "HSBC_PAYMENTS",
        direction: "INBOUND",
        processingEndDate: "1710437234000",
        transactionId: "TXN001",
        amount: "50000.00",
        currency: "USD",
        paymentType: "WIRE"
      },
      {
        fileId: "PAY002",
        fileName: "BatchPayment_20240315.xml",
        fileType: "BATCH_PAYMENT",
        status: "PROCESSING",
        clientName: "HSBC_BATCH_PAYMENTS",
        direction: "INBOUND",
        processingEndDate: "1710437235000",
        batchId: "BATCH001",
        totalAmount: "150000.00",
        numberOfTransactions: "3",
        priority: "HIGH"
      }
    ]
  },
  'com.seeburger.sil.hsbc.TransactionMonitor': {
    datastoreId: 'com.seeburger.sil.hsbc.TransactionMonitor',
    files: [
      {
        fileId: "TM001",
        fileName: "TransactionLog_20240315.log",
        fileType: "TRANSACTION_LOG",
        status: "SUCCESS",
        clientName: "HSBC_MONITOR",
        direction: "OUTBOUND",
        processingEndDate: "1710437236000",
        totalTransactions: "1500",
        successRate: "99.8",
        averageResponseTime: "0.5"
      }
    ]
  },
  'com.seeburger.sil.hsbc.AuditLogger': {
    datastoreId: 'com.seeburger.sil.hsbc.AuditLogger',
    files: [
      {
        fileId: "AUDIT001",
        fileName: "SecurityAudit_20240315.log",
        fileType: "AUDIT_LOG",
        status: "SUCCESS",
        clientName: "HSBC_SECURITY",
        direction: "INTERNAL",
        processingEndDate: "1710437237000",
        securityLevel: "HIGH",
        eventCount: "256",
        criticalEvents: "0"
      },
      {
        fileId: "AUDIT002",
        fileName: "AccessAudit_20240315.log",
        fileType: "ACCESS_LOG",
        status: "WARNING",
        clientName: "HSBC_ACCESS",
        direction: "INTERNAL",
        processingEndDate: "1710437238000",
        accessAttempts: "1024",
        failedAttempts: "5",
        ipAddresses: "12"
      }
    ]
  },
  'com.seeburger.sil.hsbc.ReportGenerator': {
    datastoreId: 'com.seeburger.sil.hsbc.ReportGenerator',
    files: [
      {
        fileId: "REP001",
        fileName: "DailyReport_20240315.pdf",
        fileType: "PDF_REPORT",
        status: "SUCCESS",
        clientName: "HSBC_REPORTING",
        direction: "OUTBOUND",
        processingEndDate: "1710437239000",
        pageCount: "45",
        reportType: "DAILY",
        department: "FINANCE"
      },
      {
        fileId: "REP002",
        fileName: "WeeklyAnalytics_20240315.xlsx",
        fileType: "EXCEL_REPORT",
        status: "SUCCESS",
        clientName: "HSBC_ANALYTICS",
        direction: "OUTBOUND",
        processingEndDate: "1710437240000",
        sheetCount: "12",
        dataPoints: "5000",
        reportPeriod: "WEEKLY"
      },
      {
        fileId: "REP003",
        fileName: "MonthlyCompliance_20240315.pdf",
        fileType: "PDF_REPORT",
        status: "FAILED",
        clientName: "HSBC_COMPLIANCE",
        direction: "OUTBOUND",
        processingEndDate: "1710437241000",
        pageCount: "0",
        reportType: "MONTHLY",
        errorCode: "REP_GEN_ERR_001"
      }
    ]
  }
};