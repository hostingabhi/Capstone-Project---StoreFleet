// Import necessary modules
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Read the brand logo image
// const brandLogo = fs.readFileSync('../../public/images/logo1-32230.png');
const brandLogo = path.resolve("public","images","logo.png")

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'abhiprajapat74@gmail.com',
    pass: 'cwpd soqq swzt jyuh'
  }
});

// Function to send welcome email
export const sendWelcomeEmail = async (user) => {
  try {
    // Construct email message
    const mailOptions = {
      from: 'your_email@gmail.com',
      to: user.email,
      subject: 'Welcome to Our Company!',
      html: `
        <img src="cid:brandlogo" />
        <h1>Welcome to Storefleet</h1>
        <P>Hello, ${user.name}!</p>
        <p>Thank you for registering with Storefleet. We're excited to have you as a new member of our community</p>
        `,
      attachments: [{
        filename: 'logo.png',
        path: brandLogo,
        cid: 'brandlogo'
      }]
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully!');
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};
