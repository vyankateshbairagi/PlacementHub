import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import {
  getStudentBookmarks,
  toggleStudentBookmark,
  toSafeDriveDto,
} from '@/lib/drive-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSession();
    const bookmarkedIds = await getStudentBookmarks(session.userId);

    let drives: any[] = [];
    if (bookmarkedIds.length > 0) {
      const records = await prisma.placementDrive.findMany({
        where: { id: { in: bookmarkedIds } },
        include: {
          institution: {
            select: { id: true, name: true, logoUrl: true, city: true },
          },
          applications: {
            select: { id: true },
          },
        },
      });
      drives = records.map((d) => toSafeDriveDto(d, { isBookmarked: true }));
    }

    return NextResponse.json({
      success: true,
      bookmarkedIds,
      drives,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { driveId, bookmarked = true } = body;

    if (!driveId) {
      return NextResponse.json(
        { success: false, error: 'driveId is required.' },
        { status: 400 }
      );
    }

    const updatedBookmarks = await toggleStudentBookmark(
      session.userId,
      driveId,
      Boolean(bookmarked)
    );

    return NextResponse.json({
      success: true,
      message: bookmarked ? 'Saved to Bookmarks' : 'Removed from Bookmarks',
      isBookmarked: bookmarked,
      bookmarkedIds: updatedBookmarks,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

