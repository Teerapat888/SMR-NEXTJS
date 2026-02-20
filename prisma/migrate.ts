import mysql from 'mysql2/promise'

async function main() {
  console.log('🔄 Running migrations...')
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root', password: '', database: 'smart_er',
  })

  const migrations = [
    "ALTER TABLE patient_bed_history ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(100) NULL",
    "ALTER TABLE patient_bed_history ADD COLUMN IF NOT EXISTS other_symptoms TEXT NULL",
    "ALTER TABLE patient_bed_history ADD COLUMN IF NOT EXISTS discharge_time DATETIME NULL",
    "ALTER TABLE patient_bed_history ADD COLUMN IF NOT EXISTS admission_time DATETIME DEFAULT CURRENT_TIMESTAMP",
  ]

  for (const sql of migrations) {
    try {
      await conn.execute(sql)
      console.log('✅', sql.slice(0, 80))
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('⏭️ Column already exists:', sql.slice(0, 80))
      else console.log('❌', e.message)
    }
  }

  await conn.end()
  console.log('🎉 Migration done!')
}

main().catch(e => { console.error(e); process.exit(1) })
