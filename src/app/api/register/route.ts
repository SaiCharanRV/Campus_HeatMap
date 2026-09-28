import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (!email.endsWith("@iitr.ac.in") && !email.endsWith(".iitr.ac.in")) {
      return NextResponse.json({ message: "Only @iitr.ac.in or departmental emails are allowed." }, { status: 400 });
    }

    if (role !== "Student" && role !== "Staff") {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    // Generate 6 digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins from now

    // Hash password for security even in OTP table
    const hashedPassword = await bcrypt.hash(password, 10);

    // Delete existing unverified OTP for this email to avoid duplicates
    await prisma.otp.deleteMany({
      where: { email }
    });

    // Store in OTP table
    await prisma.otp.create({
      data: {
        email,
        password: hashedPassword,
        role,
        code: otpCode,
        expiresAt,
      },
    });

    // Add temporary debugging logs
    console.log("USER:", process.env.GMAIL_USER ? "Loaded" : "Missing");
    console.log("PASS:", process.env.GMAIL_PASS ? "Loaded" : "Missing");

    // Configure Nodemailer transporter for Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    try {
      // Send the email
      await transporter.sendMail({
        from: `"IIT Roorkee Portal" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Your IIT Roorkee Campus Hub OTP",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4F46E5;">Verify your account</h2>
            <p>Thank you for registering on the IIT Roorkee Campus Hub.</p>
            <p>Your one-time password (OTP) is:</p>
            <div style="font-size: 24px; font-weight: bold; background: #F3F4F6; padding: 15px; text-align: center; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">
              ${otpCode}
            </div>
            <p>This code is valid for 5 minutes. Please do not share it with anyone.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError);
      // Clean up the OTP record since we failed to send the email
      await prisma.otp.deleteMany({ where: { email } });
      return NextResponse.json({ message: "Failed to send OTP email. Please check your email configuration." }, { status: 500 });
    }

    return NextResponse.json({ message: "OTP sent successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
