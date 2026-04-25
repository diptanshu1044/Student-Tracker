import { model, Schema, Types } from "mongoose";

export interface PasswordResetTokenDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const passwordResetTokenSchema = new Schema<PasswordResetTokenDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, index: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date }
  },
  { timestamps: true }
);

export const PasswordResetTokenModel = model<PasswordResetTokenDoc>(
  "PasswordResetToken",
  passwordResetTokenSchema
);
