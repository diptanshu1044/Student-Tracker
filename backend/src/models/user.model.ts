import { model, Schema, Types } from "mongoose";

export interface UserDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  emailVerified: boolean;
  notificationPreferences: {
    email: boolean;
    streak: boolean;
    applications: boolean;
    weekly: boolean;
    plannerReminders: boolean;
  };
  googleCalendarConnected: boolean;
  googleTokens?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      streak: { type: Boolean, default: true },
      applications: { type: Boolean, default: true },
      weekly: { type: Boolean, default: false },
      plannerReminders: { type: Boolean, default: true }
    },
    googleCalendarConnected: { type: Boolean, default: false },
    googleTokens: { type: String }
  },
  { timestamps: true }
);

export const UserModel = model<UserDoc>("User", userSchema);
