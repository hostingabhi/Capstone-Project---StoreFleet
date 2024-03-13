// Please don't change the pre-written code
// Import the necessary modules here

import { ErrorHandler } from "../../../utils/errorHandler.js";
import {
  addNewProductRepo,
  deleProductRepo,
  findProductRepo,
  getAllProductsRepo,
  getProductDetailsRepo,
  getTotalCountsOfProduct,
  updateProductRepo,
} from "../model/product.repository.js";
import ProductModel from "../model/product.schema.js";

export const addNewProduct = async (req, res, next) => {
  try {
    const product = await addNewProductRepo({
      ...req.body,
      createdBy: req.user._id,
    });
    if (product) {
      res.status(201).json({ success: true, product });
    } else {
      return next(new ErrorHandler(400, "some error occured!"));
    }
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const getAllProducts = async (req, res, next) => {
  try {
    let filter = {};
    let { page = 1, limit = 10, keyword, category, price, rating } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // Handle keyword search
    if (keyword) {
      filter.name = { $regex: keyword, $options: 'i' };
    }

    // Handle category filter
    if (category) {
      filter.category = category;
    }

    // Handle price filter
    if (price && price.gte && price.lte) {
      filter.price = { $gte: parseInt(price.gte), $lte: parseInt(price.lte) };
    }

    // Handle rating filter
    if (rating && rating.gte && rating.lte) {
      filter.rating = { $gte: parseInt(rating.gte), $lte: parseInt(rating.lte) };
    }

    const totalCount = await getTotalCountsOfProduct(filter);
    
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};
    if (endIndex < totalCount) {
      results.next = {
        page: page + 1,
        limit: limit
      };
    }

    if (startIndex > 0) {
      results.previous = {
        page: page - 1,
        limit: limit
      };
    }

    results.totalCount = totalCount;

    const products = await getAllProductsRepo(filter);
    results.results = products.slice(startIndex, endIndex);

    res.status(200).json({ success: true, ...results });
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};


export const updateProduct = async (req, res, next) => {
  try {
    const updatedProduct = await updateProductRepo(req.params.id, req.body);
    if (updatedProduct) {
      res.status(200).json({ success: true, updatedProduct });
    } else {
      return next(new ErrorHandler(400, "Product not found!"));
    }
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const deletedProduct = await deleProductRepo(req.params.id);
    if (deletedProduct) {
      res.status(200).json({ success: true, deletedProduct });
    } else {
      return next(new ErrorHandler(400, "Product not found!"));
    }
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const getProductDetails = async (req, res, next) => {
  try {
    const productDetails = await getProductDetailsRepo(req.params.id);
    if (productDetails) {
      res.status(200).json({ success: true, productDetails });
    } else {
      return next(new ErrorHandler(400, "Product not found!"));
    }
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const rateProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const { rating, comment } = req.body;
    const user = req.user._id;
    const name = req.user.name;
    const review = {
      user,
      name,
      rating: Number(rating),
      comment,
    };
    if (!rating) {
      return next(new ErrorHandler(400, "rating can't be empty"));
    }
    const product = await findProductRepo(productId);
    if (!product) {
      return next(new ErrorHandler(400, "Product not found!"));
    }
    const findRevieweIndex = product.reviews.findIndex((rev) => {
      return rev.user.toString() === user.toString();
    });
    if (findRevieweIndex >= 0) {
      product.reviews.splice(findRevieweIndex, 1, review);
    } else {
      product.reviews.push(review);
    }
    let avgRating = 0;
    product.reviews.forEach((rev) => {
      avgRating += rev.rating;
    });
    const updatedRatingOfProduct = avgRating / product.reviews.length;
    product.rating = updatedRatingOfProduct;
    await product.save({ validateBeforeSave: false });
    res
      .status(201)
      .json({ success: true, msg: "thx for rating the product", product });
  } catch (error) {
    return next(new ErrorHandler(500, error));
  }
};

export const getAllReviewsOfAProduct = async (req, res, next) => {
  try {
    const product = await findProductRepo(req.params.id);
    if (!product) {
      return next(new ErrorHandler(400, "Product not found!"));
    }
    res.status(200).json({ success: true, reviews: product.reviews });
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    console.log(userId);
    const { productId, reviewId } = req.query;
    
    if (!productId || !reviewId) {
      return next(new ErrorHandler(400, "Please provide productId and reviewId as query params"));
    }

    const product = await findProductRepo(productId);
    if (!product) {
      return next(new ErrorHandler(400, "Product not found!"));
    }

    const reviewIndex = product.reviews.findIndex((rev) => rev._id.toString() === reviewId.toString());
    if (reviewIndex === -1) {
      return next(new ErrorHandler(400, "Review not found!"));
    }

    // Check if the user is the owner of the review
    if (product.reviews[reviewIndex].user.toString() !== userId.toString()) {
      return next(new ErrorHandler(403, "You are not authorized to delete this review"));
    }

    // Remove the review from the product's reviews array
    const deletedReview = product.reviews.splice(reviewIndex, 1)[0];

    // Recalculate the product's rating
    let avgRating = 0;
    product.reviews.forEach((rev) => {
      avgRating += rev.rating;
    });
    product.rating = product.reviews.length > 0 ? avgRating / product.reviews.length : 0;

    // Save the updated product
    await product.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      msg: "Review deleted successfully",
      deletedReview: deletedReview,
      product: product,
    });
  } catch (error) {
    return next(new ErrorHandler(500, error));
  }
};
