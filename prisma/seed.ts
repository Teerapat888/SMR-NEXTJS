import mysql from 'mysql2/promise'
import { hash } from 'bcryptjs'

async function main() {
  console.log('🌱 Seeding database...')

  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'smart_er',
  })

  // Create tables
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      role ENUM('admin','nurse','triage') DEFAULT 'nurse',
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS patients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hn VARCHAR(20) UNIQUE NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS beds (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bed_number VARCHAR(20) UNIQUE NOT NULL,
      zone VARCHAR(20) DEFAULT 'main',
      status ENUM('available','occupied','maintenance') DEFAULT 'available',
      patient_id INT NULL,
      esi_level INT NULL,
      admitted_at DATETIME NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS patient_bed_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      bed_id INT NOT NULL,
      action VARCHAR(20) NOT NULL,
      esi_level INT NULL,
      delivery_status VARCHAR(100) NULL,
      other_symptoms TEXT NULL,
      details TEXT NULL,
      discharge_time DATETIME NULL,
      performed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Add columns if missing (for existing DBs)
  await conn.execute("ALTER TABLE patient_bed_history ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(100) NULL").catch(() => {})
  await conn.execute("ALTER TABLE patient_bed_history ADD COLUMN IF NOT EXISTS other_symptoms TEXT NULL").catch(() => {})
  await conn.execute("ALTER TABLE patient_bed_history ADD COLUMN IF NOT EXISTS discharge_time DATETIME NULL").catch(() => {})
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS queues (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      status ENUM('waiting','called','completed','cancelled') DEFAULT 'waiting',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      called_at DATETIME NULL
    )
  `)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS queue_calls (
      id INT AUTO_INCREMENT PRIMARY KEY,
      queue_id INT NOT NULL,
      called_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      action VARCHAR(50) NOT NULL,
      details TEXT NULL,
      ip_address VARCHAR(45) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
  console.log('✅ Tables created')

  // Seed users
  const adminPass = await hash('password123', 10)
  const nursePass = await hash('password123', 10)
  const triagePass = await hash('password123', 10)

  await conn.execute('INSERT IGNORE INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)', ['admin', adminPass, 'ผู้ดูแลระบบ', 'admin'])
  await conn.execute('INSERT IGNORE INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)', ['doctor1', nursePass, 'พญ.สมหญิง รักษาดี', 'nurse'])
  await conn.execute('INSERT IGNORE INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)', ['triage', triagePass, 'พยาบาลคัดกรอง', 'triage'])
  console.log('✅ Users created')

  // Seed 38 beds
  for (let i = 1; i <= 38; i++) {
    const zone = i <= 28 ? 'main' : 'temporary'
    await conn.execute('INSERT IGNORE INTO beds (bed_number, zone, status) VALUES (?, ?, ?)', [String(i), zone, 'available'])
  }
  console.log('✅ 38 beds created')

  // Seed patients
  const patients = [
    ['0000001','สมชาย','ใจดี'], ['0000002','สมหญิง','รักสุข'], ['0000003','มานะ','พากเพียร'],
    ['0000004','วิชัย','สุขสันต์'], ['0000005','ประภา','สว่างจิต'], ['0000006','กมล','เจริญสุข'],
    ['0000007','สุภาพร','ดีใจ'], ['0000008','อำนาจ','เข้มแข็ง'], ['0000009','พิมพ์ใจ','สดใส'],
    ['0000010','ธนกฤต','รุ่งเรือง'], ['0000011','นภา','ท้องฟ้า'], ['0000012','ศิริ','มงคล'],
    ['0000013','ปรีชา','ฉลาดดี'], ['0000014','ดวงใจ','เบิกบาน'], ['0000015','วรพล','ทรงพลัง'],
    ['0000016','จันทร์','เพ็ญ'], ['0000017','สมบัติ','มั่งมี'], ['0000018','รัตนา','ประเสริฐ'],
    ['0000019','ชัยวัฒน์','ก้าวหน้า'], ['0000020','อรุณ','ทอแสง'],
  ]
  for (const [hn, fn, ln] of patients) {
    await conn.execute('INSERT IGNORE INTO patients (hn, first_name, last_name) VALUES (?, ?, ?)', [hn, fn, ln])
  }
  console.log('✅ 20 patients created')

  // Default settings
  const s = JSON.stringify({
    googleTtsEnabled: true, browserTtsEnabled: false, voiceName: '', voiceLang: 'th-TH',
    speechTemplate: 'ขอเชิญหมายเลข {{HN}} เข้ารับการรักษา',
    speechPause: 0.5, speechRate: 1, pageInterval: 15, showSoundButton: true,
  })
  await conn.execute("INSERT INTO system_settings (setting_key, setting_value) VALUES ('sound_settings', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [s, s])
  console.log('✅ Settings created')

  await conn.end()
  console.log('🎉 Seed completed!')
}

main().catch(e => { console.error(e); process.exit(1) })
