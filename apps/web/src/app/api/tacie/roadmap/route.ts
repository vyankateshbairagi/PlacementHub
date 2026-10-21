import { NextResponse } from 'next/server';
import { generateCareerRoadmap } from '@/lib/tacie';

export async function POST(request: Request) {
  try {
    const { skills = [], targetRole = 'Product Engineer' } = await request.json();
    const roadmap = generateCareerRoadmap(skills, targetRole);
    return NextResponse.json({ success: true, targetRole, roadmap });
  } catch (error: any) {
    console.error('Error generating roadmap:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
