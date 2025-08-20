export const testCategories = [
  { name: 'בריאות', description: 'שירותי בריאות וטיפול', order: 1 },
  { name: 'חינוך', description: 'מוסדות חינוך ולמידה', order: 2 },
  { name: 'קהילה', description: 'מרכזים קהילתיים ופעילויות', order: 3 }
]

export const testServices = [
  {
    name: 'מרכז רפואי הדסה',
    description: 'בית חולים מוביל המתמחה ברפואה מתקדמת',
    category: 'health',
    city: 'ירושלים',
    address: 'רחוב הדסה 12',
    phones: [
      { number: '02-6777111', description: 'מוקד ראשי' },
      { number: '02-6777222', description: 'מיון' }
    ],
    emails: [{ address: 'info@hadassah.org.il', description: 'מידע כללי' }],
    websites: [{ url: 'https://hadassah.org.il', description: 'אתר ראשי' }],
    interestAreas: ['general-medicine', 'emergency-care']
  },
  {
    name: 'בית אבות נופי ירושלים',
    description: 'בית אבות ומרכז יום לקשישים',
    category: 'elderly-care',
    city: 'ירושלים',
    address: 'רחוב הפסגה 8',
    phones: [
      { number: '02-6543210', description: 'קבלה' }
    ],
    interestAreas: ['elderly-care', 'social-activities']
  },
  {
    name: 'מרכז יום לקשיש - תל אביב',
    description: 'פעילויות יום לגיל השלישי',
    category: 'day-center',
    city: 'תל אביב',
    address: 'רחוב אלנבי 15',
    phones: [
      { number: '03-1234567', description: 'משרד' }
    ],
    interestAreas: ['social-activities', 'enrichment']
  }
]

export const testInterestAreas = [
  { id: 'general-medicine', name: 'רפואה כללית', description: 'שירותי רפואה כללית' },
  { id: 'emergency-care', name: 'רפואת חירום', description: 'טיפול במצבי חירום רפואיים' },
  { id: 'elderly-care', name: 'טיפול בקשישים', description: 'שירותי טיפול ייעודיים לקשישים' },
  { id: 'social-activities', name: 'פעילויות חברתיות', description: 'מפגשים ופעילויות חברתיות' },
  { id: 'enrichment', name: 'העשרה', description: 'לימודים והעשרה לגיל השלישי' }
]