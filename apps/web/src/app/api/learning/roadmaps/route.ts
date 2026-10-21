import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { parseStringArray } from '@/lib/learning-assessment';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession([
      'STUDENT',
      'TPO',
      'FACULTY',
      'INSTITUTE_ADMIN',
      'SUPER_ADMIN',
    ]);
    const category = req.nextUrl.searchParams.get('category');
    const roadmaps = await prisma.learningRoadmap.findMany({
      where: category && category !== 'ALL' ? { category } : {},
      include: {
        modules: {
          select: { id: true, title: true, description: true, totalItems: true, topics: true, orderIndex: true },
          orderBy: { orderIndex: 'asc' },
        },
        studentProgress: {
          where: { studentProfile: { user: { email: session.email } } },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      count: roadmaps.length,
      roadmaps: roadmaps.map((roadmap) => {
        const progress = roadmap.studentProgress[0];
        return {
          id: roadmap.id,
          title: roadmap.title,
          slug: roadmap.slug,
          category: roadmap.category,
          provider: roadmap.provider,
          providerBadge: roadmap.providerBadge,
          badgeColor: roadmap.badgeColor,
          description: roadmap.description,
          totalItems: roadmap.totalItems,
          estimatedHours: roadmap.estimatedHours,
          difficulty: roadmap.difficulty,
          tags: parseStringArray(roadmap.tags),
          moduleCount: roadmap.modules.length,
          modules: roadmap.modules,
          studentProgress: {
            completedItems: progress?.completedItems || 0,
            progressPercentage: progress?.progressPercentage || 0,
            status: progress?.status || 'NOT_STARTED',
            lastActivityAt: progress?.lastActivityAt || null,
          },
          createdAt: roadmap.createdAt,
        };
      }),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession(['TPO', 'FACULTY', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const body = await req.json().catch(() => ({}));

    const {
      title,
      category = 'SYSTEM_DESIGN',
      provider = 'Campus Training Cell',
      providerBadge = 'CTC',
      badgeColor = 'blue',
      description,
      totalItems = 20,
      estimatedHours = 35,
      difficulty = 'INTERMEDIATE',
      tags = [],
      modules = [],
    } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json(
        { success: false, error: 'Learning roadmap title is required.' },
        { status: 400 }
      );
    }

    const slug = `${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${Date.now().toString().slice(-4)}`;

    const formattedTags = Array.isArray(tags)
      ? JSON.stringify(tags)
      : JSON.stringify(['Placement Prep', category]);

    const createdRoadmap = await prisma.learningRoadmap.create({
      data: {
        title: title.trim(),
        slug,
        category,
        provider,
        providerBadge,
        badgeColor,
        description: description || `Comprehensive structured curriculum for ${title.trim()}`,
        totalItems: Number(totalItems) || 20,
        estimatedHours: Number(estimatedHours) || 30,
        difficulty,
        tags: formattedTags,
        modules: {
          create: (Array.isArray(modules) && modules.length > 0
            ? modules
            : [
                {
                  title: 'Core Fundamentals & Architecture',
                  description: 'Essential mental models and basic patterns',
                  orderIndex: 0,
                  totalItems: 5,
                  topics: JSON.stringify([
                    { id: 'top-1', title: 'System Decomposition & Microservices', type: 'ARTICLE' },
                    { id: 'top-2', title: 'Horizontal vs Vertical Scaling', type: 'VIDEO' },
                  ]),
                },
                {
                  title: 'Distributed Storage & Caching',
                  description: 'High-throughput persistence with Redis and PostgreSQL',
                  orderIndex: 1,
                  totalItems: 5,
                  topics: JSON.stringify([
                    { id: 'top-3', title: 'Redis Cache-Aside and Eviction Policies', type: 'ARTICLE' },
                    { id: 'top-4', title: 'Database Sharding & Replication Strategies', type: 'LEETCODE_PROBLEM' },
                  ]),
                },
              ]
          ).map((m: any, idx: number) => ({
            title: m.title || `Module ${idx + 1}`,
            description: m.description || '',
            orderIndex: idx,
            totalItems: m.totalItems || (Array.isArray(m.topics) ? m.topics.length : 4),
            topics: typeof m.topics === 'string' ? m.topics : JSON.stringify(m.topics || []),
          })),
        },
      },
      include: {
        modules: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Learning Roadmap published successfully to student learning track.',
      roadmap: createdRoadmap,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSession(['TPO', 'FACULTY', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Roadmap ID is required.' },
        { status: 400 }
      );
    }

    await prisma.learningRoadmap.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Learning roadmap deleted successfully.',
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
