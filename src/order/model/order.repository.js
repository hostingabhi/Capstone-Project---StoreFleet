import OrderModel from "./order.schema.js";

export const createNewOrderRepo = async (data) => {
  // Write your code here for placing a new order
  try {
    const order = await OrderModel.create(data);
    return order;
  } catch (error) {
    throw new Error(error.message);
  }
};
