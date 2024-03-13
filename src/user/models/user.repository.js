import UserModel from "./user.schema.js";
import mongoose from "mongoose";
import { ObjectId } from "mongoose";

export const createNewUserRepo = async (user) => {
  const newuser = await new UserModel(user).save();
  if(newuser){
    return newuser;
  }else{
    return null;
  }
};

export const findUserRepo = async (factor, withPassword = false) => {
  if (withPassword) return await UserModel.findOne(factor).select("+password");
  else return await UserModel.findOne(factor);
};

export const findUserForPasswordResetRepo = async (hashtoken) => {
  return await UserModel.findOne({
    resetPasswordToken: hashtoken,
    resetPasswordExpire: { $gt: Date.now() },
  });
};

export const updateUserProfileRepo = async (_id, data) => {
  return await UserModel.findOneAndUpdate(_id, data, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
};

export const getAllUsersRepo = async () => {
  return UserModel.find({});
};

export const deleteUserRepo = async (_id) => {
  return await UserModel.findByIdAndDelete(_id);
};

export const updateUserRoleAndProfileRepo = async (_id, data) => {
  // Write your code here for updating the roles of other users by admin
  try {
    const admin = await UserModel.findById(_id);
    if (!admin) {
        return { success: false, message: 'admin not found.' };
    }
    admin.name = data.name;
    admin.email= data.email;
    admin.role = data.role;
    return await admin.save();
} catch (err) {
    console.log(err);
}

};
