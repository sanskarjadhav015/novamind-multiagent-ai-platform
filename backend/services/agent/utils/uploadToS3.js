import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/s3.js";

/**
 * ============================================================================
 * S3 OBJECT UPLOAD HELPER
 * ============================================================================
 * Uploads generated files (PDF, PPTX, PNG) to AWS S3 bucket.
 * ============================================================================
 * @param {string} filename - Target key name
 * @param {Buffer} buffer - File buffer data
 * @param {string} contentType - MIME type (e.g. "application/pdf")
 */
export const uploadToS3 = async (filename, buffer, contentType) => {
    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Body: buffer,
            Key: filename,
            ContentType: contentType,
            ContentDisposition: `attachment; filename="${filename}"`
        })
    );
    return filename;
};