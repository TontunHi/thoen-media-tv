import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, hashPassword, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newUsername, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    if (!currentPassword) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยัน' }, { status: 400 });
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 400 });
    }

    const updateData: any = {};

    // Change username if provided
    if (newUsername && newUsername.trim() !== user.username) {
      const existing = await prisma.user.findUnique({
        where: { username: newUsername.trim() }
      });
      if (existing && existing.id !== user.id) {
        return NextResponse.json({ error: 'Username นี้ถูกใช้งานแล้ว' }, { status: 400 });
      }
      updateData.username = newUsername.trim();
    }

    // Change password if provided
    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json({ error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(newPassword.trim());
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลที่เปลี่ยนแปลง' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user profile/password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
