import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ message: "Missing email or OTP code" }, { status: 400 });
    }

    const otpRecord = await prisma.otp.findFirst({
      where: {
        email,
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return NextResponse.json({ message: "No OTP found for this email" }, { status: 400 });
    }

    if (otpRecord.code !== code) {
      return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });
    }

    if (new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ message: "OTP has expired" }, { status: 400 });
    }

    // OTP is valid. Finalize user creation
    const newUser = await prisma.user.create({
      data: {
        email: otpRecord.email,
        password: otpRecord.password, // Already hashed
        role: otpRecord.role,
      }
    });

    // Cleanup OTP record
    await prisma.otp.deleteMany({
      where: { email }
    });

    return NextResponse.json({ message: "User registered successfully", userId: newUser.id }, { status: 200 });

  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
