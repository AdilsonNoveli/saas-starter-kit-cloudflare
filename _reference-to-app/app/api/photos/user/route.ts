import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/api-utils';
import { isPhotoFilename, readPhotoFile } from '@/lib/photo-storage';

// GET /api/photos/user - Serve the logged-in user's photo from disk
export const GET = withAuth(async (_request, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { photo: true },
    });

    if (!user || !user.photo) {
      return new NextResponse(null, { status: 404 });
    }

    if (!isPhotoFilename(user.photo)) {
      return new NextResponse(null, { status: 404 });
    }

    const result = await readPhotoFile(session.user.id, user.photo);
    if (!result) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Length': String(result.buffer.length),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
});
