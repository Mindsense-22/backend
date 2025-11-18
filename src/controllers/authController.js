const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/email");

// Generate Token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// SignUp
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ status: "fail", message: "This email is already token" });
    }

    // Generate verification code
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = await User.create({
      name,
      email,
      password,
      verificationCode: verifyCode,
      verificationCodeExpires: Date.now() + 10 * 60 * 1000,
    });

    const message = `Hello ${name},\n\nYour activation code for MindSense AI is:\n${verifyCode}\n\nThis code is valid for 10 minutes.`;

    try {
      await sendEmail({
        email: newUser.email,
        subject: "Account activation code - MindSense AI",
        message: message,
      });

      res.status(201).json({
        status: "success",
        message:
          "Registration successful! Check your email for the activation code.",
      });
    } catch (err) {
      // Delete user to resignup
      await User.findByIdAndDelete(newUser._id);
      return res.status(500).json({
        status: "error",
        message: "An error occurred while sending the email. Please try again.",
      });
    }
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// Verify Account
exports.verifyAccount = async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email }).select(
      "+verificationCode +verificationCodeExpires"
    );

    if (!user) {
      return res
        .status(400)
        .json({ status: "fail", message: "User not found" });
    }

    if (
      user.verificationCode !== code ||
      user.verificationCodeExpires < Date.now()
    ) {
      return res.status(400).json({
        status: "fail",
        message: "The code is invalid or has expired.",
      });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    const token = signToken(user._id);

    res.status(200).json({
      status: "success",
      token,
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Please enter your email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: "fail",
        message: "wrong email or password",
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        status: "fail",
        message: "Please activate your account first.",
      });
    }

    const token = signToken(user._id);
    res.status(200).json({
      status: "success",
      token,
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// Add Trusted Contact
exports.addTrustedContact = async (req, res) => {
  try {
    const { contactName, contactEmail, relationship } = req.body;

    const user = await User.findById(req.user.id);

    const approvalToken = crypto.randomBytes(32).toString("hex");

    user.trustedContact = {
      name: contactName,
      email: contactEmail,
      relationship: relationship,
      status: "pending",
      confirmationToken: approvalToken,
    };
    await user.save({ validateBeforeSave: false });

    // Approval Link
    const approvalLink = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/users/approve-contact/${approvalToken}`;

    const message = `
        Hello ${contactName},

        ${user.name} has added you as a trusted contact in the MindSense AI app.

        Your role is to receive notifications to check on them during times of high stress.

        If you agree, please click the following link:

        ${approvalLink}
        `;

    await sendEmail({
      email: contactEmail,
      subject: "An invitation to be a trustworthy person - MindSense AI",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "An invitation was successfully sent to the trusted person.",
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// Accept Trusted Contact
exports.acceptTrustedContact = async (req, res) => {
  try {
    const token = req.params.token;

    const user = await User.findOne({
      "trustedContact.confirmationToken": token,
    });

    if (!user) {
      return res.status(400).send(`
                <div style="text-align: center; padding: 50px; font-family: Arial;">
                    <h1 style="color: red;">Sorry! The link is invalid or expired.</h1>
                </div>
            `);
    }

    user.trustedContact.status = "accepted";
    user.trustedContact.confirmationToken = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).send(`
            <div style="text-align: center; padding: 50px; font-family: Arial;">
               <h1 style="color: green;">Invitation accepted successfully! ✅</h1>
                <p>Thank you, you are now a "trusted contact" for user ${user.name}.</p>
                <p>You will receive notifications if they detect high levels of stress.</p>
            </div>
        `);
  } catch (err) {
    res.status(500).send("Server error");
  }
};
