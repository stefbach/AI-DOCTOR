export const MEDICATION_POSOLOGY_DATABASE: { [key: string]: any } = {
  // ANTIBIOTICS
  'amoxicillin': {
    posology: '1 capsule three times daily',
    duration: '7-10 days',
    packaging: 'box of 21-30 capsules',
    quantity: '1 box',
    instructions: 'Take with or without food. Complete the full course even if symptoms improve.'
  },
  'amoxicillin-clavulanate': {
    posology: '1 tablet twice daily',
    duration: '7 days',
    packaging: 'box of 14 tablets',
    quantity: '1 box',
    instructions: 'Take with food to minimize stomach upset.'
  },
  'augmentin': {
    posology: '1 tablet twice daily',
    duration: '7 days',
    packaging: 'box of 14 tablets',
    quantity: '1 box',
    instructions: 'Take with food to minimize stomach upset.'
  },
  'azithromycin': {
    posology: '500mg once daily', // ACTUALLY once daily
    duration: '3-5 days',
    packaging: 'box of 3-5 tablets',
    quantity: '1 box',
    instructions: 'Can be taken with or without food. Take at the same time each day.'
  },
  'cephalexin': {
    posology: '1 capsule four times daily',
    duration: '7-10 days',
    packaging: 'box of 28-40 capsules',
    quantity: '1-2 boxes',
    instructions: 'Take at evenly spaced intervals. Can be taken with food if stomach upset occurs.'
  },
  'cefuroxime': {
    posology: '1 tablet twice daily',
    duration: '7-10 days',
    packaging: 'box of 14-20 tablets',
    quantity: '1 box',
    instructions: 'Take with food for better absorption.'
  },
  'ciprofloxacin': {
    posology: '1 tablet twice daily',
    duration: '3-7 days',
    packaging: 'box of 6-14 tablets',
    quantity: '1 box',
    instructions: 'Take with a full glass of water. Avoid dairy products within 2 hours of dose.'
  },
  'levofloxacin': {
    posology: '1 tablet once daily', // Actually once daily
    duration: '5-7 days',
    packaging: 'box of 5-7 tablets',
    quantity: '1 box',
    instructions: 'Take at the same time each day with plenty of water.'
  },
  'metronidazole': {
    posology: '1 tablet three times daily',
    duration: '7 days',
    packaging: 'box of 21 tablets',
    quantity: '1 box',
    instructions: 'Avoid alcohol during treatment and for 48 hours after completion.'
  },
  'nitrofurantoin': {
    posology: '1 capsule four times daily with food',
    duration: '5-7 days',
    packaging: 'box of 20-28 capsules',
    quantity: '1 box',
    instructions: 'Must be taken with food or milk to improve absorption and reduce nausea.'
  },
  'doxycycline': {
    posology: '1 capsule twice daily',
    duration: '7 days',
    packaging: 'box of 14 capsules',
    quantity: '1 box',
    instructions: 'Take with a full glass of water. Avoid lying down for 30 minutes after dose.'
  },
  'flucloxacillin': {
    posology: '1 capsule four times daily on empty stomach',
    duration: '7 days',
    packaging: 'box of 28 capsules',
    quantity: '1 box',
    instructions: 'Take 1 hour before or 2 hours after meals for best absorption.'
  },
  'clindamycin': {
    posology: '1 capsule three times daily',
    duration: '7 days',
    packaging: 'box of 21 capsules',
    quantity: '1 box',
    instructions: 'Take with a full glass of water to prevent esophageal irritation.'
  },
  'penicillin': {
    posology: '1 tablet four times daily',
    duration: '10 days',
    packaging: 'box of 40 tablets',
    quantity: '1 box',
    instructions: 'Take on empty stomach for best absorption.'
  },
  'trimethoprim': {
    posology: '1 tablet twice daily',
    duration: '3 days',
    packaging: 'box of 6 tablets',
    quantity: '1 box',
    instructions: 'Take with or without food. Drink plenty of fluids.'
  },
  'fosfomycin': {
    posology: 'Single dose dissolved in water',
    duration: 'Single dose',
    packaging: '1 sachet of 3g',
    quantity: '1 sachet',
    instructions: 'Dissolve in half glass of water and drink immediately. Take on empty stomach.'
  },
  
  // NSAIDs
  'ibuprofen': {
    posology: '1 tablet (400mg) three times daily with food',
    duration: '5 days',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'Must be taken with food or milk to prevent stomach upset. Do not exceed recommended dose.'
  },
  'diclofenac': {
    posology: '1 tablet (50mg) three times daily with food',
    duration: '5 days',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'Take with food. Avoid if history of stomach ulcers.'
  },
  'naproxen': {
    posology: '1 tablet (500mg) twice daily with food',
    duration: '5 days',
    packaging: 'box of 20 tablets',
    quantity: '1 box',
    instructions: 'Take with food or milk. Allow 12 hours between doses.'
  },
  'indomethacin': {
    posology: '1 capsule (25mg) three times daily with food',
    duration: '5 days',
    packaging: 'box of 30 capsules',
    quantity: '1 box',
    instructions: 'Take with food, milk, or antacid to reduce stomach irritation.'
  },
  'celecoxib': {
    posology: '1 capsule (200mg) twice daily',
    duration: '5 days',
    packaging: 'box of 20 capsules',
    quantity: '1 box',
    instructions: 'Can be taken with or without food.'
  },
  'ketorolac': {
    posology: '1 tablet (10mg) every 6 hours',
    duration: '5 days maximum',
    packaging: 'box of 20 tablets',
    quantity: '1 box',
    instructions: 'Short-term use only. Take with food.'
  },
  
  // ANALGESICS
  'paracetamol': {
    posology: '2 tablets (500mg each) every 6 hours as needed',
    duration: 'As needed for pain/fever',
    packaging: 'box of 20 tablets',
    quantity: '1-2 boxes',
    instructions: 'Can be taken with or without food. Maximum 8 tablets (4g) per day.'
  },
  'acetaminophen': {
    posology: '2 tablets (500mg each) every 6 hours as needed',
    duration: 'As needed for pain/fever',
    packaging: 'box of 20 tablets',
    quantity: '1-2 boxes',
    instructions: 'Can be taken with or without food. Maximum 8 tablets (4g) per day.'
  },
  'codeine': {
    posology: '1-2 tablets (30mg) every 4-6 hours as needed',
    duration: 'As needed for pain',
    packaging: 'box of 20 tablets',
    quantity: '1 box',
    instructions: 'May cause drowsiness. Avoid alcohol. Can be habit-forming.'
  },
  'tramadol': {
    posology: '1-2 tablets (50mg) every 4-6 hours as needed',
    duration: 'As needed for pain',
    packaging: 'box of 20 tablets',
    quantity: '1 box',
    instructions: 'May cause drowsiness and dizziness. Start with lowest dose.'
  },
  
  // GASTROINTESTINAL
  'omeprazole': {
    posology: '1 capsule (20mg) once daily before breakfast', // Actually once daily
    duration: '14-28 days',
    packaging: 'box of 28 capsules',
    quantity: '1 box',
    instructions: 'Take 30-60 minutes before breakfast. Swallow capsule whole, do not crush.'
  },
  'esomeprazole': {
    posology: '1 tablet (20mg) once daily before breakfast', // Actually once daily
    duration: '14-28 days',
    packaging: 'box of 28 tablets',
    quantity: '1 box',
    instructions: 'Take at least 1 hour before meals. Swallow whole.'
  },
  'lansoprazole': {
    posology: '1 capsule (30mg) once daily before breakfast', // Actually once daily
    duration: '14-28 days',
    packaging: 'box of 28 capsules',
    quantity: '1 box',
    instructions: 'Take 30 minutes before breakfast. Do not crush or chew.'
  },
  'ranitidine': {
    posology: '1 tablet (150mg) twice daily',
    duration: '14-28 days',
    packaging: 'box of 28 tablets',
    quantity: '1 box',
    instructions: 'Take morning and evening, with or without food.'
  },
  'domperidone': {
    posology: '1 tablet (10mg) three times daily before meals',
    duration: '3-5 days',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'Take 15-30 minutes before meals for best effect.'
  },
  'metoclopramide': {
    posology: '1 tablet (10mg) three times daily before meals',
    duration: '3-5 days',
    packaging: 'box of 20 tablets',
    quantity: '1 box',
    instructions: 'Take 30 minutes before meals. May cause drowsiness.'
  },
  'ondansetron': {
    posology: '1 tablet (4mg) twice daily',
    duration: '2-3 days',
    packaging: 'box of 10 tablets',
    quantity: '1 box',
    instructions: 'Can be taken with or without food. Dissolves on tongue.'
  },
  'hyoscine': {
    posology: '1 tablet (10mg) three times daily',
    duration: '3 days',
    packaging: 'box of 20 tablets',
    quantity: '1 box',
    instructions: 'Take when spasms occur. May cause dry mouth.'
  },
  'mebeverine': {
    posology: '1 tablet (135mg) three times daily before meals',
    duration: '7-14 days',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'Take 20 minutes before meals. Swallow whole.'
  },
  'loperamide': {
    posology: '2 capsules initially, then 1 after each loose stool (max 8/day)',
    duration: '2-3 days',
    packaging: 'box of 20 capsules',
    quantity: '1 box',
    instructions: 'Do not use if fever or bloody diarrhea present.'
  },
  
  // ANTIHISTAMINES
  'cetirizine': {
    posology: '1 tablet (10mg) once daily', // Actually once daily
    duration: 'As needed',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'Take at same time each day. Can be taken with or without food.'
  },
  'loratadine': {
    posology: '1 tablet (10mg) once daily', // Actually once daily
    duration: 'As needed',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'Take at same time each day. Non-drowsy formula.'
  },
  'chlorpheniramine': {
    posology: '1 tablet (4mg) three times daily',
    duration: 'As needed',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'May cause drowsiness. Avoid driving.'
  },
  'fexofenadine': {
    posology: '1 tablet (120mg) once daily', // Actually once daily
    duration: 'As needed',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'Take with water. Avoid fruit juices.'
  },
  
  // CORTICOSTEROIDS
  'prednisolone': {
    posology: '2 tablets (20mg total) once daily in morning',
    duration: '5 days',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'Take in the morning with food to reduce stomach irritation. Do not stop abruptly.'
  },
  'methylprednisolone': {
    posology: '2 tablets (4mg each) twice daily',
    duration: '5 days',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'Take with food. Taper dose if used long-term.'
  },
  'dexamethasone': {
    posology: '1 tablet (4mg) twice daily',
    duration: '3 days',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'Take with food to minimize stomach upset.'
  },
  'hydrocortisone': {
    posology: '1 tablet (20mg) twice daily',
    duration: '5 days',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'Take with food. Morning dose should be larger.'
  },
  
  // ANTIHYPERTENSIVES
  'amlodipine': {
    posology: '1 tablet (5mg) once daily', // Actually once daily
    duration: 'Long-term',
    packaging: 'box of 30 tablets',
    quantity: '1 box per month',
    instructions: 'Take at the same time each day. Can be taken with or without food.'
  },
  'lisinopril': {
    posology: '1 tablet (10mg) once daily', // Actually once daily
    duration: 'Long-term',
    packaging: 'box of 30 tablets',
    quantity: '1 box per month',
    instructions: 'Take at the same time each day. May cause dry cough.'
  },
  'enalapril': {
    posology: '1 tablet (10mg) once daily', // Actually once daily
    duration: 'Long-term',
    packaging: 'box of 30 tablets',
    quantity: '1 box per month',
    instructions: 'Take at the same time each day. Monitor blood pressure regularly.'
  },
  'losartan': {
    posology: '1 tablet (50mg) once daily', // Actually once daily
    duration: 'Long-term',
    packaging: 'box of 30 tablets',
    quantity: '1 box per month',
    instructions: 'Can be taken with or without food. Monitor potassium levels.'
  },
  'atenolol': {
    posology: '1 tablet (50mg) once daily', // Actually once daily
    duration: 'Long-term',
    packaging: 'box of 30 tablets',
    quantity: '1 box per month',
    instructions: 'Take at the same time each day. Do not stop suddenly.'
  },
  'metoprolol': {
    posology: '1 tablet (50mg) twice daily',
    duration: 'Long-term',
    packaging: 'box of 60 tablets',
    quantity: '1 box per month',
    instructions: 'Take with food. Monitor heart rate.'
  },
  'hydrochlorothiazide': {
    posology: '1 tablet (12.5mg) once daily in morning', // Actually once daily
    duration: 'Long-term',
    packaging: 'box of 30 tablets',
    quantity: '1 box per month',
    instructions: 'Take in morning to avoid nighttime urination. Stay hydrated.'
  },
  
  // RESPIRATORY
  'salbutamol': {
    posology: '2 puffs every 4-6 hours as needed',
    duration: 'As needed',
    packaging: '200 dose inhaler',
    quantity: '1 inhaler',
    instructions: 'Shake well before use. Rinse mouth after use. Use spacer if available.'
  },
  'budesonide': {
    posology: '2 puffs twice daily',
    duration: 'Long-term',
    packaging: '200 dose inhaler',
    quantity: '1 inhaler per month',
    instructions: 'Rinse mouth after use to prevent thrush. Use regularly for best effect.'
  },
  'ipratropium': {
    posology: '2 puffs four times daily',
    duration: 'As prescribed',
    packaging: '200 dose inhaler',
    quantity: '1 inhaler',
    instructions: 'Use regularly at evenly spaced intervals.'
  },
  'montelukast': {
    posology: '1 tablet (10mg) once daily at bedtime', // Actually once daily
    duration: 'Long-term',
    packaging: 'box of 30 tablets',
    quantity: '1 box per month',
    instructions: 'Take in the evening for asthma, anytime for allergies.'
  },
  
  // ANTIFUNGALS
  'fluconazole': {
    posology: 'Single dose of 150mg',
    duration: 'Single dose',
    packaging: '1 capsule',
    quantity: '1 capsule',
    instructions: 'Single dose treatment. Can be taken with or without food.'
  },
  'itraconazole': {
    posology: '1 capsule (100mg) twice daily with food',
    duration: '7-14 days',
    packaging: 'box of 14-28 capsules',
    quantity: '1 box',
    instructions: 'Take with food for better absorption. Avoid antacids.'
  },
  'ketoconazole': {
    posology: '1 tablet (200mg) once daily with food', // Actually once daily
    duration: '5-10 days',
    packaging: 'box of 10 tablets',
    quantity: '1 box',
    instructions: 'Take with food to improve absorption. Avoid alcohol.'
  },
  'terbinafine': {
    posology: '1 tablet (250mg) once daily', // Actually once daily
    duration: '6-12 weeks',
    packaging: 'box of 28 tablets',
    quantity: '3 boxes',
    instructions: 'Take at the same time each day. Complete full course.'
  },
  'nystatin': {
    posology: '1ml four times daily',
    duration: '7 days',
    packaging: '30ml bottle',
    quantity: '1 bottle',
    instructions: 'Swish in mouth for 1 minute then swallow. Use after meals.'
  },
  'clotrimazole': {
    posology: '1 pessary (500mg) at bedtime',
    duration: 'Single dose',
    packaging: '1 pessary with applicator',
    quantity: '1 pessary',
    instructions: 'Insert deep into vagina at bedtime. Remain lying down after insertion.'
  },
  'miconazole': {
    posology: 'Apply cream twice daily',
    duration: '7-14 days',
    packaging: '30g tube',
    quantity: '1 tube',
    instructions: 'Apply to clean, dry affected area. Continue for 2 days after symptoms clear.'
  },
  
  // TOPICAL PREPARATIONS - EAR DROPS
  'ciprofloxacin ear': {
    posology: '4 drops in affected ear twice daily',
    duration: '7 days',
    packaging: '5ml bottle',
    quantity: '1 bottle',
    instructions: 'Warm to body temperature. Lie on side, instill drops, remain in position for 5 minutes.'
  },
  'ofloxacin ear': {
    posology: '10 drops in affected ear twice daily',
    duration: '7 days',
    packaging: '10ml bottle',
    quantity: '1 bottle',
    instructions: 'Warm bottle in hands before use. Keep head tilted for 2 minutes after instillation.'
  },
  'gentamicin ear': {
    posology: '2-3 drops three times daily',
    duration: '7-10 days',
    packaging: '10ml bottle',
    quantity: '1 bottle',
    instructions: 'Clean ear canal before application if possible.'
  },
  'hydrocortisone ear': {
    posology: '4 drops twice daily',
    duration: '7 days',
    packaging: '10ml bottle',
    quantity: '1 bottle',
    instructions: 'Shake well before use. Avoid if eardrum perforated.'
  },
  'dexamethasone ear': {
    posology: '3-4 drops three times daily',
    duration: '7 days',
    packaging: '5ml bottle',
    quantity: '1 bottle',
    instructions: 'Warm to room temperature before use.'
  },
  
  // TOPICAL PREPARATIONS - EYE DROPS
  'chloramphenicol eye': {
    posology: '1 drop every 2 hours for 2 days, then 4 times daily',
    duration: '5-7 days',
    packaging: '10ml bottle',
    quantity: '1 bottle',
    instructions: 'Pull lower eyelid down, instill drop, close eye gently for 1 minute.'
  },
  'tobramycin eye': {
    posology: '1-2 drops every 4 hours',
    duration: '7 days',
    packaging: '5ml bottle',
    quantity: '1 bottle',
    instructions: 'Avoid touching dropper tip to eye. Remove contact lenses before use.'
  },
  'ciprofloxacin eye': {
    posology: '1-2 drops every 2 hours for 2 days, then 4 times daily',
    duration: '5-7 days',
    packaging: '5ml bottle',
    quantity: '1 bottle',
    instructions: 'Continue for 2 days after symptoms resolve.'
  },
  'ofloxacin eye': {
    posology: '1-2 drops four times daily',
    duration: '7 days',
    packaging: '5ml bottle',
    quantity: '1 bottle',
    instructions: 'Space doses evenly throughout the day.'
  },
  'artificial tears': {
    posology: '1-2 drops 4 times daily or as needed',
    duration: 'As needed',
    packaging: '10ml bottle',
    quantity: '1 bottle',
    instructions: 'Can be used as often as needed for comfort.'
  },
  
  // OTHERS
  'vitamin b6': {
    posology: '1 tablet (25mg) three times daily',
    duration: 'As needed',
    packaging: 'box of 30 tablets',
    quantity: '1 box',
    instructions: 'Take with food to prevent stomach upset.'
  },
  'folic acid': {
    posology: '1 tablet (5mg) once daily', // Actually once daily
    duration: 'Throughout pregnancy',
    packaging: 'box of 30 tablets',
    quantity: '1 box per month',
    instructions: 'Essential during pregnancy. Take at same time each day.'
  },
  'iron': {
    posology: '1 tablet once daily on empty stomach', // Actually once daily
    duration: '3 months',
    packaging: 'box of 30 tablets',
    quantity: '1 box per month',
    instructions: 'Take with vitamin C for better absorption. May cause constipation.'
  },
  'vitamin d': {
    posology: '1 tablet once daily', // Actually once daily
    duration: 'Long-term',
    packaging: 'box of 30 tablets',
    quantity: '1 box per month',
    instructions: 'Take with fatty meal for better absorption.'
  },
  'calcium': {
    posology: '1 tablet twice daily with meals',
    duration: 'Long-term',
    packaging: 'box of 60 tablets',
    quantity: '1 box per month',
    instructions: 'Take with meals. Space doses at least 4 hours apart.'
  },
  'potassium citrate': {
    posology: '1 sachet three times daily dissolved in water',
    duration: '5 days',
    packaging: 'box of 20 sachets',
    quantity: '1 box',
    instructions: 'Dissolve in full glass of water. Take with food.'
  },
  'ors': {
    posology: '1 sachet dissolved in 1L water, drink throughout the day',
    duration: 'Until diarrhea stops',
    packaging: 'box of 10 sachets',
    quantity: '1 box',
    instructions: 'Use clean, boiled and cooled water. Discard solution after 24 hours.'
  },
  'probiotics': {
    posology: '1 capsule twice daily',
    duration: '5-7 days',
    packaging: 'box of 10-14 capsules',
    quantity: '1 box',
    instructions: 'Take with meals. Store in cool, dry place.'
  }
};
