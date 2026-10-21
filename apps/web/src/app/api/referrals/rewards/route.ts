import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { sendPipelineNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals/rewards
 * Returns genuine reward ledger entries, user balance, and institutional leaderboard.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await requireSession();

    // 1. Fetch user's personal ledger entries
    const userLedgerEntries = await prisma.rewardLedger.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const currentBalance = userLedgerEntries.length > 0 ? userLedgerEntries[0].balanceAfter : 0;
    const totalEarned = userLedgerEntries
      .filter((e) => e.points > 0)
      .reduce((sum, e) => sum + e.points, 0);
    const totalRedeemed = Math.abs(
      userLedgerEntries
        .filter((e) => e.points < 0)
        .reduce((sum, e) => sum + e.points, 0)
    );

    // 2. Fetch institutional leaderboard
    const allLedger = await prisma.rewardLedger.findMany({
      where: {
        ...(session.institutionId ? { institutionId: session.institutionId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    const userMap: Record<
      string,
      {
        userId: string;
        name: string;
        email: string;
        role: string;
        totalPoints: number;
        transactionsCount: number;
      }
    > = {};

    for (const entry of allLedger) {
      if (!entry.user) continue;
      if (!userMap[entry.userId]) {
        userMap[entry.userId] = {
          userId: entry.userId,
          name: entry.user.name,
          email: entry.user.email,
          role: entry.user.role,
          totalPoints: 0,
          transactionsCount: 0,
        };
      }
      userMap[entry.userId].totalPoints += entry.points;
      userMap[entry.userId].transactionsCount += 1;
    }

    const leaderboard = Object.values(userMap)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      summary: {
        currentBalance,
        totalEarned,
        totalRedeemed,
      },
      ledger: userLedgerEntries,
      leaderboard,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/referrals/rewards
 * Supports:
 * 1. User redemptions: action="REDEEM", item="College Hoodie" / "Amazon Gift Card" / "Mock Interview Pass"
 * 2. Admin bonus credits: action="CREDIT", targetUserId, points, reason
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { action, points, item, targetUserId, reason } = body;

    if (action === 'REDEEM') {
      const redeemCost = Math.abs(Number(points || 100));
      if (!item) {
        return NextResponse.json({ success: false, error: 'Item name is required for redemption.' }, { status: 400 });
      }

      // Check balance
      const lastEntry = await prisma.rewardLedger.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      });

      const currentBalance = lastEntry?.balanceAfter || 0;
      if (currentBalance < redeemCost) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient balance. You have ${currentBalance} points, but "${item}" requires ${redeemCost} points.`,
          },
          { status: 400 }
        );
      }

      const newBalance = currentBalance - redeemCost;
      const ledgerRecord = await prisma.rewardLedger.create({
        data: {
          userId: session.userId,
          institutionId: session.institutionId ?? null,
          points: -redeemCost,
          type: 'REDEMPTION',
          description: `Redeemed ${redeemCost} pts for "${item}"`,
          balanceAfter: newBalance,
        },
      });

      await sendPipelineNotification({
        userId: session.userId,
        type: 'REFERRAL_REWARD',
        title: `Redemption Confirmed: ${item}`,
        message: `You successfully redeemed ${redeemCost} points for ${item}. Your remaining balance is ${newBalance} points.`,
        actionUrl: '/student',
      });

      return NextResponse.json({
        success: true,
        message: `Successfully redeemed ${item}!`,
        newBalance,
        ledgerRecord,
      });
    }

    if (action === 'CREDIT') {
      // Must be staff
      if (!['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      if (!targetUserId || !points) {
        return NextResponse.json({ success: false, error: 'targetUserId and points are required.' }, { status: 400 });
      }

      const creditAmount = Math.abs(Number(points));
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'Target user not found.' }, { status: 404 });
      }

      const lastEntry = await prisma.rewardLedger.findFirst({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      });

      const currentBalance = lastEntry?.balanceAfter || 0;
      const newBalance = currentBalance + creditAmount;

      const ledgerRecord = await prisma.rewardLedger.create({
        data: {
          userId: targetUserId,
          institutionId: targetUser.institutionId ?? session.institutionId ?? null,
          points: creditAmount,
          type: 'BONUS_AWARD',
          description: reason || 'Institutional reward bonus credit',
          balanceAfter: newBalance,
        },
      });

      await sendPipelineNotification({
        userId: targetUserId,
        userEmail: targetUser.email,
        type: 'REFERRAL_REWARD',
        title: `Bonus Points Credited: +${creditAmount} Points!`,
        message: `You received +${creditAmount} CareerOS reward points. Reason: ${reason || 'Special achievement'}. New balance: ${newBalance} points.`,
        actionUrl: '/student',
      });

      return NextResponse.json({
        success: true,
        message: `Credited ${creditAmount} points to ${targetUser.name}.`,
        newBalance,
        ledgerRecord,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Must be REDEEM or CREDIT.' }, { status: 400 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
