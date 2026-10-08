import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true },

    // A user cannot log in until they prove they control the mailbox.
    emailVerified: { type: Boolean, default: false, index: true },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    emailVerificationAttempts: { type: Number, default: 0, select: false },
    emailVerificationSentAt: { type: Date, select: false },
    // Tokens issued before this moment are rejected (set whenever the password changes).
    passwordChangedAt: { type: Date, select: false },

    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.emailVerificationTokenHash;
    delete ret.emailVerificationExpires;
    delete ret.emailVerificationAttempts;
    delete ret.emailVerificationSentAt;
    delete ret.passwordChangedAt;
    delete ret.resetTokenHash;
    delete ret.resetTokenExpires;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
