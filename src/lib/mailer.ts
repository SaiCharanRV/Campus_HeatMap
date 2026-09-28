import nodemailer from "nodemailer";

// Basic transporter setup (for development/simulation purposes)
// In a real application, you'd use real SMTP credentials from an env file
export const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email", // Replace with your SMTP host
  port: 587,
  auth: {
    user: process.env.EMAIL_USER || "test@example.com",
    pass: process.env.EMAIL_PASS || "password123",
  },
});

export const sendOTP = async (to: string, otp: string) => {
  const mailOptions = {
    from: '"IITR App" <no-reply@iitr.ac.in>',
    to,
    subject: "Your OTP for Registration",
    text: `Your OTP for registration is: ${otp}. It is valid for 5 minutes.`,
    html: `<p>Your OTP for registration is: <strong>${otp}</strong>. It is valid for 5 minutes.</p>`,
  };

  try {
    // Simulate sending email.
    console.log(`[MAILER SIMULATION] Sending OTP ${otp} to ${to}`);
    // await transporter.sendMail(mailOptions); // Uncomment for actual mailing
  } catch (error) {
    console.error("Error sending OTP email", error);
    throw new Error("Could not send email");
  }
};
