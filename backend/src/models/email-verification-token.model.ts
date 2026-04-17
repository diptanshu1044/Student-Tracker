import { model, Schema, Types } from "mongoose";

export interface EmailVerificationTokenDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emailVerificationTokenSchema = new Schema<EmailVerificationTokenDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date }
  },
  { timestamps: true }
);

export const EmailVerificationTokenModel = model<EmailVerificationTokenDoc>(
  "EmailVerificationToken",
  emailVerificationTokenSchema
);
