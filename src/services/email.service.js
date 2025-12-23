// src/services/email.service.js
// Enhanced email service with enrollment notifications
const nodemailer = require('nodemailer');

// Configure email transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

const emailService = {
    /**
     * Send welcome email with credentials
     */
    async sendWelcomeEmail(user, password) {
        try {
            const transporter = createTransporter();

            const mailOptions = {
                from: `"${process.env.APP_NAME || 'Internship Management System'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: user.email,
                subject: 'Welcome to Internship Management System',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                line-height: 1.6;
                                color: #333;
                            }
                            .container {
                                max-width: 600px;
                                margin: 0 auto;
                                padding: 20px;
                            }
                            .header {
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                padding: 30px;
                                text-align: center;
                                border-radius: 10px 10px 0 0;
                            }
                            .content {
                                background: #f9fafb;
                                padding: 30px;
                                border: 1px solid #e5e7eb;
                            }
                            .credentials {
                                background: white;
                                padding: 20px;
                                border-radius: 8px;
                                margin: 20px 0;
                                border-left: 4px solid #667eea;
                            }
                            .credential-item {
                                margin: 10px 0;
                            }
                            .credential-label {
                                font-weight: bold;
                                color: #667eea;
                            }
                            .credential-value {
                                font-family: monospace;
                                background: #f3f4f6;
                                padding: 8px 12px;
                                border-radius: 4px;
                                display: inline-block;
                                margin-top: 5px;
                            }
                            .button {
                                display: inline-block;
                                background: #667eea;
                                color: white;
                                padding: 12px 30px;
                                text-decoration: none;
                                border-radius: 6px;
                                margin: 20px 0;
                            }
                            .footer {
                                text-align: center;
                                padding: 20px;
                                color: #6b7280;
                                font-size: 14px;
                            }
                            .warning {
                                background: #fef3c7;
                                border-left: 4px solid #f59e0b;
                                padding: 15px;
                                margin: 20px 0;
                                border-radius: 4px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>Welcome to Internship Management System!</h1>
                            </div>
                            <div class="content">
                                <h2>Hello ${user.name},</h2>
                                <p>Your account has been successfully created. You can now access the Internship Management System using the credentials below:</p>
                                
                                <div class="credentials">
                                    <div class="credential-item">
                                        <div class="credential-label">Email Address:</div>
                                        <div class="credential-value">${user.email}</div>
                                    </div>
                                    <div class="credential-item">
                                        <div class="credential-label">Temporary Password:</div>
                                        <div class="credential-value">${password}</div>
                                    </div>
                                    <div class="credential-item">
                                        <div class="credential-label">Role:</div>
                                        <div class="credential-value">${user.role.toUpperCase()}</div>
                                    </div>
                                </div>

                                <div class="warning">
                                    <strong>⚠️ Important Security Notice:</strong>
                                    <p style="margin: 10px 0 0 0;">Please change your password immediately after your first login to ensure account security.</p>
                                </div>

                                <center>
                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
                                        Login to Your Account
                                    </a>
                                </center>

                                <h3>Getting Started:</h3>
                                <ul>
                                    <li>Log in using the credentials provided above</li>
                                    <li>Complete your profile information</li>
                                    <li>Change your temporary password</li>
                                    <li>Explore available internships</li>
                                </ul>

                                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

                                <p>Best regards,<br>The Internship Management Team</p>
                            </div>
                            <div class="footer">
                                <p>This is an automated message. Please do not reply to this email.</p>
                                <p>&copy; ${new Date().getFullYear()} Internship Management System. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                text: `
Welcome to Internship Management System!

Hello ${user.name},

Your account has been successfully created. Here are your login credentials:

Email: ${user.email}
Temporary Password: ${password}
Role: ${user.role.toUpperCase()}

IMPORTANT: Please change your password immediately after your first login.

Login URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

Getting Started:
1. Log in using the credentials provided above
2. Complete your profile information
3. Change your temporary password
4. Explore available internships

If you have any questions, please contact our support team.

Best regards,
The Internship Management Team
                `,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Welcome email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending welcome email:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Send enrollment notification with detailed internship info
     */
    async sendEnrollmentNotification(student, internship, trainer) {
        try {
            const transporter = createTransporter();

            const startDate = new Date(internship.startDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const endDate = new Date(internship.endDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const mailOptions = {
                from: `"${process.env.APP_NAME || 'Internship Management System'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: student.email,
                subject: `🎉 Enrolled in ${internship.title}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                line-height: 1.6;
                                color: #333;
                                margin: 0;
                                padding: 0;
                            }
                            .container {
                                max-width: 650px;
                                margin: 0 auto;
                                background: #ffffff;
                            }
                            .header {
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                padding: 40px 30px;
                                text-align: center;
                                border-radius: 10px 10px 0 0;
                            }
                            .header h1 {
                                margin: 0;
                                font-size: 28px;
                                font-weight: 600;
                            }
                            .header .emoji {
                                font-size: 50px;
                                margin-bottom: 10px;
                            }
                            .content {
                                padding: 40px 30px;
                                background: #f9fafb;
                            }
                            .greeting {
                                font-size: 18px;
                                color: #1f2937;
                                margin-bottom: 20px;
                            }
                            .message {
                                background: white;
                                padding: 25px;
                                border-radius: 10px;
                                margin: 20px 0;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            }
                            .internship-details {
                                background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                                padding: 25px;
                                border-radius: 10px;
                                margin: 25px 0;
                                border-left: 5px solid #667eea;
                            }
                            .detail-row {
                                display: flex;
                                padding: 12px 0;
                                border-bottom: 1px solid #d1d5db;
                            }
                            .detail-row:last-child {
                                border-bottom: none;
                            }
                            .detail-label {
                                font-weight: 600;
                                color: #667eea;
                                min-width: 140px;
                                display: flex;
                                align-items: center;
                            }
                            .detail-label .icon {
                                margin-right: 8px;
                            }
                            .detail-value {
                                color: #374151;
                                flex: 1;
                            }
                            .info-box {
                                background: #dbeafe;
                                border-left: 4px solid #3b82f6;
                                padding: 20px;
                                margin: 25px 0;
                                border-radius: 6px;
                            }
                            .info-box strong {
                                color: #1e40af;
                                display: block;
                                margin-bottom: 8px;
                            }
                            .success-box {
                                background: #d1fae5;
                                border-left: 4px solid #10b981;
                                padding: 20px;
                                margin: 25px 0;
                                border-radius: 6px;
                            }
                            .success-box strong {
                                color: #065f46;
                            }
                            .button {
                                display: inline-block;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                padding: 14px 35px;
                                text-decoration: none;
                                border-radius: 8px;
                                margin: 25px 0;
                                font-weight: 600;
                                box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
                                transition: transform 0.2s;
                            }
                            .button:hover {
                                transform: translateY(-2px);
                            }
                            .next-steps {
                                background: white;
                                padding: 25px;
                                border-radius: 10px;
                                margin: 25px 0;
                            }
                            .next-steps h3 {
                                color: #667eea;
                                margin-top: 0;
                            }
                            .next-steps ul {
                                padding-left: 20px;
                            }
                            .next-steps li {
                                margin: 12px 0;
                                color: #4b5563;
                            }
                            .footer {
                                text-align: center;
                                padding: 30px;
                                background: #1f2937;
                                color: #9ca3af;
                                font-size: 14px;
                                border-radius: 0 0 10px 10px;
                            }
                            .footer p {
                                margin: 8px 0;
                            }
                            .trainer-info {
                                background: #fef3c7;
                                padding: 20px;
                                border-radius: 8px;
                                margin: 20px 0;
                                border-left: 4px solid #f59e0b;
                            }
                            .trainer-info strong {
                                color: #92400e;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <div class="emoji">🎉</div>
                                <h1>Congratulations on Your Enrollment!</h1>
                            </div>
                            
                            <div class="content">
                                <p class="greeting">Hello <strong>${student.name}</strong>,</p>
                                
                                <div class="message">
                                    <p style="margin: 0; font-size: 16px; color: #374151;">
                                        We're excited to inform you that you have been successfully enrolled in the following internship program. 
                                        This is a great opportunity to enhance your skills and gain valuable experience!
                                    </p>
                                </div>

                                <div class="internship-details">
                                    <h2 style="margin-top: 0; color: #1f2937; font-size: 22px;">
                                        📚 ${internship.title}
                                    </h2>
                                    
                                    <div class="detail-row">
                                        <div class="detail-label">
                                            <span class="icon">📅</span> Start Date:
                                        </div>
                                        <div class="detail-value">${startDate}</div>
                                    </div>
                                    
                                    <div class="detail-row">
                                        <div class="detail-label">
                                            <span class="icon">🏁</span> End Date:
                                        </div>
                                        <div class="detail-value">${endDate}</div>
                                    </div>
                                    
                                    <div class="detail-row">
                                        <div class="detail-label">
                                            <span class="icon">⏱️</span> Duration:
                                        </div>
                                        <div class="detail-value">
                                            ${Math.ceil((new Date(internship.endDate) - new Date(internship.startDate)) / (1000 * 60 * 60 * 24))} days
                                        </div>
                                    </div>
                                    
                                    <div class="detail-row">
                                        <div class="detail-label">
                                            <span class="icon">📊</span> Status:
                                        </div>
                                        <div class="detail-value">
                                            <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                                                ${internship.status.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                ${internship.description ? `
                                    <div class="info-box">
                                        <strong>📝 About This Internship:</strong>
                                        <p style="margin: 8px 0 0 0; color: #1e3a8a;">${internship.description}</p>
                                    </div>
                                ` : ''}

                                ${trainer ? `
                                    <div class="trainer-info">
                                        <strong>👨‍🏫 Your Trainer:</strong>
                                        <p style="margin: 8px 0 0 0; color: #78350f;">
                                            <strong>${trainer.name}</strong><br>
                                            Email: ${trainer.email}
                                        </p>
                                    </div>
                                ` : ''}

                                <div class="success-box">
                                    <strong>✅ Enrollment Confirmed</strong>
                                    <p style="margin: 8px 0 0 0; color: #065f46;">
                                        Your enrollment has been confirmed. You can now access all internship materials, 
                                        assignments, and resources through your dashboard.
                                    </p>
                                </div>

                                <center>
                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/internships" class="button">
                                        View My Internships
                                    </a>
                                </center>

                                <div class="next-steps">
                                    <h3>📋 Next Steps:</h3>
                                    <ul>
                                        <li><strong>Login to your dashboard</strong> to access internship materials</li>
                                        <li><strong>Review the internship description</strong> and requirements carefully</li>
                                        <li><strong>Check for assignments</strong> and upcoming deadlines</li>
                                        <li><strong>Contact your trainer</strong> if you have any questions</li>
                                        <li><strong>Mark your calendar</strong> with the start date and key milestones</li>
                                        <li><strong>Prepare any necessary materials</strong> before the start date</li>
                                    </ul>
                                </div>

                                <div class="info-box">
                                    <strong>💡 Important Reminder:</strong>
                                    <p style="margin: 8px 0 0 0; color: #1e3a8a;">
                                        Regular attendance and active participation are essential for successful completion. 
                                        Make sure to stay engaged and complete all assignments on time.
                                    </p>
                                </div>

                                <p style="margin-top: 30px; color: #4b5563;">
                                    We're excited to have you on board and look forward to your success in this internship!
                                </p>

                                <p style="color: #4b5563;">
                                    Best regards,<br>
                                    <strong>The Internship Management Team</strong>
                                </p>
                            </div>
                            
                            <div class="footer">
                                <p><strong>Need Help?</strong></p>
                                <p>If you have any questions or concerns, please don't hesitate to reach out to your trainer or our support team.</p>
                                <p style="margin-top: 20px;">This is an automated message. Please do not reply to this email.</p>
                                <p>&copy; ${new Date().getFullYear()} Internship Management System. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                text: `
🎉 CONGRATULATIONS ON YOUR ENROLLMENT!

Hello ${student.name},

You have been successfully enrolled in the following internship:

═══════════════════════════════════════════════
INTERNSHIP DETAILS
═══════════════════════════════════════════════

Title: ${internship.title}
Start Date: ${startDate}
End Date: ${endDate}
Duration: ${Math.ceil((new Date(internship.endDate) - new Date(internship.startDate)) / (1000 * 60 * 60 * 24))} days
Status: ${internship.status.toUpperCase()}

${internship.description ? `
About This Internship:
${internship.description}
` : ''}

${trainer ? `
Your Trainer:
Name: ${trainer.name}
Email: ${trainer.email}
` : ''}

═══════════════════════════════════════════════
NEXT STEPS
═══════════════════════════════════════════════

1. Login to your dashboard to access internship materials
2. Review the internship description and requirements
3. Check for assignments and upcoming deadlines
4. Contact your trainer if you have any questions
5. Mark your calendar with important dates
6. Prepare necessary materials before the start date

Access Your Dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/internships

═══════════════════════════════════════════════

We're excited to have you on board and look forward to your success!

Best regards,
The Internship Management Team

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Internship Management System. All rights reserved.
                `,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Enrollment notification sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending enrollment notification:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Send unenrollment notification
     */
    async sendUnenrollmentNotification(student, internship, reason = null) {
        try {
            const transporter = createTransporter();

            const mailOptions = {
                from: `"${process.env.APP_NAME || 'Internship Management System'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: student.email,
                subject: `Unenrollment Notice - ${internship.title}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                line-height: 1.6;
                                color: #333;
                            }
                            .container {
                                max-width: 600px;
                                margin: 0 auto;
                                padding: 20px;
                            }
                            .header {
                                background: #ef4444;
                                color: white;
                                padding: 30px;
                                text-align: center;
                                border-radius: 10px 10px 0 0;
                            }
                            .content {
                                background: #f9fafb;
                                padding: 30px;
                                border: 1px solid #e5e7eb;
                            }
                            .notice-box {
                                background: #fee2e2;
                                border-left: 4px solid #ef4444;
                                padding: 20px;
                                margin: 20px 0;
                                border-radius: 4px;
                            }
                            .info-box {
                                background: white;
                                padding: 20px;
                                border-radius: 8px;
                                margin: 20px 0;
                                border-left: 4px solid #3b82f6;
                            }
                            .footer {
                                text-align: center;
                                padding: 20px;
                                color: #6b7280;
                                font-size: 14px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>Unenrollment Notice</h1>
                            </div>
                            <div class="content">
                                <h2>Hello ${student.name},</h2>
                                <p>This is to inform you that you have been unenrolled from the following internship:</p>
                                
                                <div class="info-box">
                                    <h3 style="margin-top: 0;">${internship.title}</h3>
                                    <p><strong>Start Date:</strong> ${new Date(internship.startDate).toLocaleDateString()}</p>
                                    <p><strong>End Date:</strong> ${new Date(internship.endDate).toLocaleDateString()}</p>
                                </div>

                                ${reason ? `
                                    <div class="notice-box">
                                        <strong>Reason:</strong>
                                        <p style="margin: 10px 0 0 0;">${reason}</p>
                                    </div>
                                ` : ''}

                                <p>If you believe this is an error or have any questions, please contact your trainer or our support team immediately.</p>

                                <p>Best regards,<br>The Internship Management Team</p>
                            </div>
                            <div class="footer">
                                <p>This is an automated message. Please do not reply to this email.</p>
                                <p>&copy; ${new Date().getFullYear()} Internship Management System. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                text: `
Unenrollment Notice

Hello ${student.name},

This is to inform you that you have been unenrolled from the following internship:

Title: ${internship.title}
Start Date: ${new Date(internship.startDate).toLocaleDateString()}
End Date: ${new Date(internship.endDate).toLocaleDateString()}

${reason ? `Reason: ${reason}` : ''}

If you believe this is an error or have any questions, please contact your trainer or our support team immediately.

Best regards,
The Internship Management Team
                `,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Unenrollment notification sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending unenrollment notification:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(user, resetToken) {
        try {
            const transporter = createTransporter();
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

            const mailOptions = {
                from: `"${process.env.APP_NAME || 'Internship Management System'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: user.email,
                subject: 'Password Reset Request',
                html: `
                    <h2>Password Reset Request</h2>
                    <p>Hello ${user.name},</p>
                    <p>You requested to reset your password. Click the button below to reset it:</p>
                    <a href="${resetUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                        Reset Password
                    </a>
                    <p>Or copy and paste this link into your browser:</p>
                    <p>${resetUrl}</p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                `,
            };

            await transporter.sendMail(mailOptions);
            return { success: true };
        } catch (error) {
            console.error('Error sending password reset email:', error);
            return { success: false, error: error.message };
        }
    },
};

module.exports = emailService;