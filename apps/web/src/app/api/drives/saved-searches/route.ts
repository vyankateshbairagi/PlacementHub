import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import {
  addStudentSavedSearch,
  getStudentSavedSearches,
  removeStudentSavedSearch,
} from '@/lib/drive-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSession();
    const searches = await getStudentSavedSearches(session.userId);
    return NextResponse.json({ success: true, savedSearches: searches });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { name, query, filters } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Saved search name is required.' },
        { status: 400 }
      );
    }

    const updated = await addStudentSavedSearch(session.userId, {
      name: name.trim(),
      query: query?.trim() || '',
      filters: filters || {},
    });

    return NextResponse.json({
      success: true,
      message: `Search '${name.trim()}' saved successfully!`,
      savedSearches: updated,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Search ID is required.' },
        { status: 400 }
      );
    }

    const updated = await removeStudentSavedSearch(session.userId, id);

    return NextResponse.json({
      success: true,
      message: 'Saved search removed.',
      savedSearches: updated,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

