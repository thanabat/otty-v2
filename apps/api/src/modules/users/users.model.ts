import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    line_user_id: {
      type: String,
      index: true
    },
    personal_info: {
      fullname: String,
      nickname: String,
      basecamp_name: String,
      email: String
    },
    working_info: {
      current_site: String,
      current_site_other: String,
      project: String,
      joining_year: Number,
      referrer: String
    },
    created_at: Date,
    updated_at: Date,
    is_active: {
      type: Boolean,
      default: true
    },
    has_purchased_ticket: {
      type: Boolean,
      default: false
    }
  },
  {
    collection: "users",
    versionKey: false,
    strict: false
  }
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserModel =
  mongoose.models.User ?? mongoose.model("User", userSchema);
