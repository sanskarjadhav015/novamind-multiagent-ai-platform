import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../config/s3.js";

/**
 * ============================================================================
 * S3 UPLOAD UTILITY (`uploadToS3.js`)
 * ============================================================================
 * Uploads a raw in-memory binary buffer directly to the configured AWS S3 bucket.
 * ============================================================================
 * @param {string} fileName - Unique destination object key
 * @param {Buffer} buffer - File data buffer
 * @param {string} contentType - MIME type (e.g. application/pdf, image/png)
 */
export const uploadToS3 = async (fileName, buffer, contentType) => {
    try {
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: contentType
        });

        return await s3.send(command);
    } catch (error) {
        console.error("[S3 Upload] Failed:", error);
        throw error;
    }
};
