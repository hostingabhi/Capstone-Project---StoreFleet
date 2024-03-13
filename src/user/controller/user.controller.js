// Please don't change the pre-written code
// Import the necessary modules here

import { sendPasswordResetEmail } from "../../../utils/emails/passwordReset.js";
import { sendWelcomeEmail } from "../../../utils/emails/welcomeMail.js";
import { ErrorHandler } from "../../../utils/errorHandler.js";
import { sendToken } from "../../../utils/sendToken.js";
import {
  createNewUserRepo,
  deleteUserRepo,
  findUserForPasswordResetRepo,
  findUserRepo,
  getAllUsersRepo,
  updateUserProfileRepo,
  updateUserRoleAndProfileRepo,
} from "../models/user.repository.js";
import crypto from "crypto";
import UserModel from "../models/user.schema.js";
import nodemailer from 'nodemailer';

export const createNewUser = async (req, res, next) => {
  const { name, email, password } = req.body;
  try {
    const newUser = await createNewUserRepo(req.body);
    if (newUser) {
      await sendToken(newUser, res, 200);
      await sendWelcomeEmail(newUser);
    } else {
      return res.status(400).json({ success: true, msg: "email already registerd" });
    }

    // Implement sendWelcomeEmail function to send welcome message
  } catch (err) {
    //  handle error for duplicate email
    return next(new ErrorHandler(400, "email already registerd"));
  }
};

export const userLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ErrorHandler(400, "please enter email/password"));
    }
    const user = await findUserRepo({ email }, true);
    if (!user) {
      return next(
        new ErrorHandler(401, "user not found! register yourself now!!")
      );
    }
    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return next(new ErrorHandler(401, "Invalid email or passswor!"));
    }
    await sendToken(user, res, 200);
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const logoutUser = async (req, res, next) => {
  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({ success: true, msg: "logout successful" });
};

export const forgetPassword = async (req, res, next) => {
  // Implement feature for forget password
  const { email } = req.body;

  try {
    // Find user by email
    const user = await UserModel.findOne({ email });

    // If user doesn't exist, return error
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate reset token
    const resetToken = await user.getResetPasswordToken();

    // Save the user with the reset token and expiry time
    await user.save();

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      // Configure transporter (e.g., Gmail SMTP)
      // Example configuration for Gmail:
      service: process.env.SMPT_SERVICE,
      auth: {
        user: process.env.STORFLEET_SMPT_MAIL,
        pass: process.env.STORFLEET_SMPT_MAIL_PASSWORD,
      },
    });

    // Email message
    const mailOptions = {
      from: process.env.STORFLEET_SMPT_MAIL,
      to: email,
      subject: 'Password Reset Request',
      text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n`
        + `Please click on the following link, or paste this into your browser to complete the process within 10 minutes of receiving it:\n\n`
        + `${process.env.CLIENT_URL}/reset-password/${resetToken}\n\n`
        + `If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const resetUserPassword = async (req, res, next) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  try {
    // Find user by reset token
    const user = await UserModel.findOne({
      resetPasswordToken: crypto.createHash("sha256").update(token).digest("hex"),
      resetPasswordExpire: { $gt: Date.now() }, // Check if token is not expired
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password and confirm password do not match' });
    }

    // Update user's password
    user.password = password;

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // Save user
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


export const getUserDetails = async (req, res, next) => {
  try {
    const userDetails = await findUserRepo({ _id: req.user._id });
    res.status(200).json({ success: true, userDetails });
  } catch (error) {
    return next(new ErrorHandler(500, error));
  }
};

export const updatePassword = async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  try {
    if (!currentPassword) {
      return next(new ErrorHandler(401, "pls enter current password"));
    }

    const user = await findUserRepo({ _id: req.user._id }, true);
    const passwordMatch = await user.comparePassword(currentPassword);
    if (!passwordMatch) {
      return next(new ErrorHandler(401, "Incorrect current password!"));
    }

    if (!newPassword || newPassword !== confirmPassword) {
      return next(
        new ErrorHandler(401, "mismatch new password and confirm password!")
      );
    }

    user.password = newPassword;
    await user.save();
    await sendToken(user, res, 200);
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const updateUserProfile = async (req, res, next) => {
  const { name, email } = req.body;
  try {
    const updatedUserDetails = await updateUserProfileRepo(req.user._id, {
      name,
      email,
    });
    res.status(201).json({ success: true, updatedUserDetails });
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

// admin controllers
export const getAllUsers = async (req, res, next) => {
  try {
    const allUsers = await getAllUsersRepo();
    res.status(200).json({ success: true, allUsers });
  } catch (error) {
    return next(new ErrorHandler(500, error));
  }
};

export const getUserDetailsForAdmin = async (req, res, next) => {
  try {
    const userDetails = await findUserRepo({ _id: req.params.id });
    if (!userDetails) {
      return res
        .status(400)
        .json({ success: false, msg: "no user found with provided id" });
    }
    res.status(200).json({ success: true, userDetails });
  } catch (error) {
    return next(new ErrorHandler(500, error));
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const deletedUser = await deleteUserRepo(req.params.id);
    if (!deletedUser) {
      return res
        .status(400)
        .json({ success: false, msg: "no user found with provided id" });
    }

    res
      .status(200)
      .json({ success: true, msg: "user deleted successfully", deletedUser });
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const updateUserProfileAndRole = async (req, res, next) => {
  // Write your code here for updating the roles of other users by admin
  try {
    const userId = req.params.id;
    const { name, email, role } = req.body;
    const updateuser = await updateUserRoleAndProfileRepo(userId,{name, email, role});
    return res.status(200).send(updateuser);
  } catch (err) {
    console.log(err);
  }
};
