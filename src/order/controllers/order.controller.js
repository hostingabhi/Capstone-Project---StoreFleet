// order.controller.js

import { createNewOrderRepo } from "../model/order.repository.js";
import { ErrorHandler } from "../../../utils/errorHandler.js";

export const createNewOrder = async (req, res, next) => {
  try {
    const { shippingInfo, orderedItems, paymentInfo, itemsPrice, taxPrice, shippingPrice, totalPrice, orderStatus, deliveredAt } = req.body;
    const user = req.user._id; // Assuming user ID is available in the request

    // Set paidAt to the current date/time if it's not provided
    const paidAt = req.body.paidAt || new Date();

    // Create a new order
    const order = await createNewOrderRepo({
      shippingInfo,
      orderedItems,
      user,
      paymentInfo,
      paidAt,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      orderStatus,
      deliveredAt
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    return next(new ErrorHandler(400, error.message));
  }
};
