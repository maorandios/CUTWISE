import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { NestingReport } from '../types'

interface BOMPDFProps {
  nestingReport: NestingReport
  companyName?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #333',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  headerLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  headerValue: {
    fontSize: 10,
    color: '#1a1a1a',
  },
  totalTonnage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 10,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontWeight: 'bold',
    borderBottom: '2 solid #333',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #e5e7eb',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  col1: {
    width: '35%',
    fontSize: 10,
  },
  col2: {
    width: '25%',
    fontSize: 10,
    textAlign: 'right',
  },
  col3: {
    width: '20%',
    fontSize: 10,
    textAlign: 'right',
  },
  col4: {
    width: '20%',
    fontSize: 10,
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },
})

export function BOMPDF({ nestingReport, companyName = 'Your Company Name' }: BOMPDFProps) {
  // Calculate total tonnage
  const totalTonnage = Object.values(nestingReport.profiles).reduce((sum, profile) => {
    return sum + profile.total_weight
  }, 0)

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Prepare BOM data - group by profile and stock length
  const bomData: Array<{
    profileType: string
    stockLength: number
    amount: number
    weight: number
  }> = []

  Object.entries(nestingReport.profiles).forEach(([profileName, profileData]) => {
    // Group by stock length
    const stockLengthMap = new Map<number, { count: number; weight: number }>()
    
    profileData.patterns.forEach((pattern) => {
      const stockLength = pattern.stock_length
      const existing = stockLengthMap.get(stockLength) || { count: 0, weight: 0 }
      stockLengthMap.set(stockLength, {
        count: existing.count + 1,
        weight: existing.weight + pattern.weight,
      })
    })

    // Add to BOM data
    stockLengthMap.forEach((data, stockLength) => {
      bomData.push({
        profileType: profileName,
        stockLength: stockLength,
        amount: data.count,
        weight: data.weight,
      })
    })
  })

  // Sort by profile type, then by stock length
  bomData.sort((a, b) => {
    if (a.profileType !== b.profileType) {
      return a.profileType.localeCompare(b.profileType)
    }
    return a.stockLength - b.stockLength
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Bill of Materials (BOM)</Text>
          
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerLabel}>Company:</Text>
              <Text style={styles.headerValue}>{companyName}</Text>
            </View>
            <View>
              <Text style={styles.headerLabel}>Date:</Text>
              <Text style={styles.headerValue}>{currentDate}</Text>
            </View>
          </View>
          
          <Text style={styles.totalTonnage}>
            Total Tonnage: {totalTonnage.toFixed(3)} tonnes
          </Text>
        </View>

        {/* Table Section */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Profile Type</Text>
            <Text style={styles.col2}>Stock Length (mm)</Text>
            <Text style={styles.col3}>Amount</Text>
            <Text style={styles.col4}>Weight (tonnes)</Text>
          </View>

          {/* Table Rows */}
          {bomData.map((row, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.col1}>{row.profileType}</Text>
              <Text style={styles.col2}>{row.stockLength.toLocaleString()}</Text>
              <Text style={styles.col3}>{row.amount}</Text>
              <Text style={styles.col4}>{row.weight.toFixed(3)}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated by CUTWISE - Steel Nesting Optimization System</Text>
        </View>
      </Page>
    </Document>
  )
}
