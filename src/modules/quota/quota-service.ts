import { LedgerType, Prisma, type UserQuotaAccount } from '@prisma/client';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { prisma } from '../../shared/prisma/client';

interface ConsumeResult {
  quotaUsed: boolean;
  source: 'daily_free' | 'adCredits' | 'purchasedCredits' | 'member';
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function ensureQuotaAccount(userId: string): Promise<UserQuotaAccount> {
  return prisma.userQuotaAccount.upsert({
    where: { userId },
    create: { userId },
    update: {}
  });
}

export async function grantSignupBonus(userId: string): Promise<void> {
  if (env.SIGNUP_BONUS_QUOTA <= 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.userQuotaAccount.upsert({
      where: { userId },
      create: { userId, purchasedCredits: env.SIGNUP_BONUS_QUOTA },
      update: { purchasedCredits: { increment: env.SIGNUP_BONUS_QUOTA } }
    });

    await tx.quotaLedger.create({
      data: {
        userId,
        type: LedgerType.SIGNUP_BONUS,
        amount: env.SIGNUP_BONUS_QUOTA,
        balanceType: 'purchasedCredits'
      }
    });
  });
}

export async function getQuotaSummary(userId: string): Promise<{
  dailyFreeLimit: number;
  dailyFreeUsed: number;
  adCredits: number;
  purchasedCredits: number;
  memberUntil: Date | null;
}> {
  const account = await ensureQuotaAccount(userId);
  const today = startOfUtcDay();
  const dailyFreeUsed = await prisma.quotaLedger.count({
    where: {
      userId,
      type: LedgerType.DAILY_FREE_USED,
      createdAt: { gte: today }
    }
  });

  return {
    dailyFreeLimit: env.DAILY_FREE_QUOTA,
    dailyFreeUsed,
    adCredits: account.adCredits,
    purchasedCredits: account.purchasedCredits,
    memberUntil: account.memberUntil
  };
}

export async function consumeParseQuota(userId: string, requestId: string): Promise<ConsumeResult> {
  return prisma.$transaction(async (tx) => {
    const account = await tx.userQuotaAccount.upsert({
      where: { userId },
      create: { userId },
      update: {}
    });

    if (account.memberUntil && account.memberUntil > new Date()) {
      await tx.quotaLedger.create({
        data: {
          userId,
          type: LedgerType.PURCHASED_CREDIT_USED,
          amount: 0,
          balanceType: 'member',
          requestId
        }
      });
      return { quotaUsed: true, source: 'member' };
    }

    const today = startOfUtcDay();
    const dailyFreeUsed = await tx.quotaLedger.count({
      where: {
        userId,
        type: LedgerType.DAILY_FREE_USED,
        createdAt: { gte: today }
      }
    });

    if (dailyFreeUsed < env.DAILY_FREE_QUOTA) {
      await tx.quotaLedger.create({
        data: {
          userId,
          type: LedgerType.DAILY_FREE_USED,
          amount: -1,
          balanceType: 'dailyFree',
          requestId
        }
      });
      return { quotaUsed: true, source: 'daily_free' };
    }

    if (account.adCredits > 0) {
      await tx.userQuotaAccount.update({
        where: { userId },
        data: { adCredits: { decrement: 1 } }
      });
      await tx.quotaLedger.create({
        data: {
          userId,
          type: LedgerType.AD_CREDIT_USED,
          amount: -1,
          balanceType: 'adCredits',
          requestId
        }
      });
      return { quotaUsed: true, source: 'adCredits' };
    }

    if (account.purchasedCredits > 0) {
      await tx.userQuotaAccount.update({
        where: { userId },
        data: { purchasedCredits: { decrement: 1 } }
      });
      await tx.quotaLedger.create({
        data: {
          userId,
          type: LedgerType.PURCHASED_CREDIT_USED,
          amount: -1,
          balanceType: 'purchasedCredits',
          requestId
        }
      });
      return { quotaUsed: true, source: 'purchasedCredits' };
    }

    throw new AppError({
      code: 'QUOTA_EXHAUSTED',
      message: 'No parse quota remains. Watch an ad or buy credits to continue.',
      statusCode: 402
    });
  });
}

export async function grantAdReward(userId: string, clientEventId: string): Promise<{ rewardAmount: number; duplicate: boolean }> {
  const today = startOfUtcDay();
  const todayRewards = await prisma.adRewardEvent.count({
    where: {
      userId,
      status: 'GRANTED',
      createdAt: { gte: today }
    }
  });

  if (todayRewards >= env.AD_REWARD_DAILY_LIMIT) {
    throw new AppError({
      code: 'AD_REWARD_DAILY_LIMIT',
      message: 'Daily ad reward limit reached.',
      statusCode: 429
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.adRewardEvent.create({
        data: {
          userId,
          clientEventId,
          rewardAmount: env.AD_REWARD_QUOTA,
          status: 'GRANTED'
        }
      });

      await tx.userQuotaAccount.upsert({
        where: { userId },
        create: { userId, adCredits: env.AD_REWARD_QUOTA },
        update: { adCredits: { increment: env.AD_REWARD_QUOTA } }
      });

      await tx.quotaLedger.create({
        data: {
          userId,
          type: LedgerType.AD_REWARD,
          amount: env.AD_REWARD_QUOTA,
          balanceType: 'adCredits',
          metadata: { clientEventId } as Prisma.InputJsonValue
        }
      });
    });

    return { rewardAmount: env.AD_REWARD_QUOTA, duplicate: false };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { rewardAmount: 0, duplicate: true };
    }
    throw error;
  }
}
