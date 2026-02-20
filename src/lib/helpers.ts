// ESI Level colors and labels
export const ESI_LEVELS = [
  { level: 1, label: 'ESI 1 - Resuscitation', color: '#DC2626', bgClass: 'bg-red-600', textClass: 'text-white' },
  { level: 2, label: 'ESI 2 - Emergent', color: '#EC4899', bgClass: 'bg-pink-500', textClass: 'text-white' },
  { level: 3, label: 'ESI 3 - Urgent', color: '#EAB308', bgClass: 'bg-yellow-500', textClass: 'text-black' },
  { level: 4, label: 'ESI 4 - Less Urgent', color: '#22C55E', bgClass: 'bg-green-500', textClass: 'text-white' },
  { level: 5, label: 'ESI 5 - Non-Urgent', color: '#6B7280', bgClass: 'bg-gray-500', textClass: 'text-white' },
] as const

export function getEsiInfo(level: number | null) {
  if (!level) return { label: 'ยังไม่ประเมิน', color: '#9CA3AF', bgClass: 'bg-gray-400', textClass: 'text-white' }
  return ESI_LEVELS.find(e => e.level === level) || ESI_LEVELS[4]
}

export function getEsiBorderColor(level: number | null): string {
  switch (level) {
    case 1: return 'border-red-600'
    case 2: return 'border-pink-500'
    case 3: return 'border-yellow-500'
    case 4: return 'border-green-500'
    case 5: return 'border-gray-500'
    default: return 'border-gray-300'
  }
}

export function getEsiBgColor(level: number | null): string {
  switch (level) {
    case 1: return 'bg-red-600'
    case 2: return 'bg-pink-500'
    case 3: return 'bg-yellow-500'
    case 4: return 'bg-green-500'
    case 5: return 'bg-gray-500'
    default: return 'bg-gray-300'
  }
}

// Bed labels
const BED_LABELS: Record<string, string> = {
  '1': 'R1', '2': 'R2', '3': 'R3',
  '4': 'N1', '5': 'N2',
  '6': 'NT1', '7': 'NT2', '8': 'NT3', '9': 'NT4', '10': 'NT5',
  '11': 'NT6', '12': 'NT7', '13': 'NT8', '14': 'NT9', '15': 'NT10', '16': 'NT11',
  '17': 'T12', '18': 'T13', '19': 'T14', '20': 'T15', '21': 'T16',
  '22': 'T17', '23': 'T18', '24': 'T19',
  '25': '20', '26': '21',
  '27': 'จุดคัดกรอง', '28': 'VVIP',
}

export function formatBedNumber(bedNumber: string): string {
  return BED_LABELS[bedNumber] || bedNumber
}

export function formatThaiDateTime(date: Date | string | null): string {
  if (!date) return '-'
  const d = new Date(date)
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  const day = d.getDate()
  const month = thaiMonths[d.getMonth()]
  const year = d.getFullYear() + 543
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${year} ${hours}:${minutes}`
}

export function timeAgo(date: Date | string | null): string {
  if (!date) return '-'
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'เมื่อสักครู่'
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} วันที่แล้ว`
}

// All bed definitions
export const ALL_BEDS = [
  // Main zone
  { number: '1', label: 'R1', zone: 'main' },
  { number: '2', label: 'R2', zone: 'main' },
  { number: '3', label: 'R3', zone: 'main' },
  { number: '4', label: 'N1', zone: 'main' },
  { number: '5', label: 'N2', zone: 'main' },
  { number: '6', label: 'NT1', zone: 'main' },
  { number: '7', label: 'NT2', zone: 'main' },
  { number: '8', label: 'NT3', zone: 'main' },
  { number: '9', label: 'NT4', zone: 'main' },
  { number: '10', label: 'NT5', zone: 'main' },
  { number: '11', label: 'NT6', zone: 'main' },
  { number: '12', label: 'NT7', zone: 'main' },
  { number: '13', label: 'NT8', zone: 'main' },
  { number: '14', label: 'NT9', zone: 'main' },
  { number: '15', label: 'NT10', zone: 'main' },
  { number: '16', label: 'NT11', zone: 'main' },
  { number: '17', label: 'T12', zone: 'main' },
  { number: '18', label: 'T13', zone: 'main' },
  { number: '19', label: 'T14', zone: 'main' },
  { number: '20', label: 'T15', zone: 'main' },
  { number: '21', label: 'T16', zone: 'main' },
  { number: '22', label: 'T17', zone: 'main' },
  { number: '23', label: 'T18', zone: 'main' },
  { number: '24', label: 'T19', zone: 'main' },
  { number: '25', label: '20', zone: 'main' },
  { number: '26', label: '21', zone: 'main' },
  { number: '27', label: 'จุดคัดกรอง', zone: 'main' },
  { number: '28', label: 'VVIP', zone: 'main' },
  // Temporary zone
  { number: '29', label: '29', zone: 'temporary' },
  { number: '30', label: '30', zone: 'temporary' },
  { number: '31', label: '31', zone: 'temporary' },
  { number: '32', label: '32', zone: 'temporary' },
  { number: '33', label: '33', zone: 'temporary' },
  { number: '34', label: '34', zone: 'temporary' },
  { number: '35', label: '35', zone: 'temporary' },
  { number: '36', label: '36', zone: 'temporary' },
  { number: '37', label: '37', zone: 'temporary' },
  { number: '38', label: '38', zone: 'temporary' },
]
