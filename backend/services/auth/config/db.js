import mongoose from "mongoose";

/**
 * ============================================================================
 * MONGODB CONNECTION HANDLER (Auth Service)
 * ============================================================================
 */
const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Auth Service MongoDB connected");
    } catch (error) {
        console.error(`Auth Service DB connection failed: ${error}`);
    }
};

export default connectDb;