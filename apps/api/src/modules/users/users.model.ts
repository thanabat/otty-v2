import mongoose, { Schema, type InferSchemaType } from "mongoose";

const workingExperienceSchema = new Schema(
  {
    site: String,
    project: String,
    start_year: Number,
    end_year: Number,
    is_current: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: true,
    id: false,
    versionKey: false
  }
);

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
      email: String,
      phone: String,
      bio: String,
      picture_url: String
    },
    working_info: {
      current_site: String,
      current_site_other: String,
      project: String,
      title: String,
      joining_year: Number,
      referrer: String,
      referrer_user_id: {
        type: String,
        index: true
      }
    },
    working_experiences: [workingExperienceSchema],
    emergency_contact_user_ids: [String],
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
