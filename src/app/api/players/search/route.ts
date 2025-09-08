import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const fastApiUrl = `http://localhost:8000/search/aggregate?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`FastAPI server responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ data, source: 'fastapi' });

  } catch (error) {
    console.error('Error fetching from FastAPI:', error);
    return NextResponse.json(
      { error: 'FastAPI server is not available' }, 
      { status: 503 }
    );
  }
}
