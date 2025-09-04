import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text || text.trim() === '') {
      return NextResponse.json({ translatedText: '' });
    }
    
    // FREE Google Translate - No API key needed!
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Translation failed:', response.status);
      return NextResponse.json({ translatedText: text });
    }
    
    const data = await response.json();
    // Translation is in the nested array
    const translatedText = data[0]?.[0]?.[0] || text;
    
    console.log('Translated:', text, '→', translatedText);
    
    return NextResponse.json({ translatedText });
    
  } catch (error) {
    console.error('Translation error:', error);
    // Return original text if translation fails
    return NextResponse.json({ translatedText: text });
  }
}
