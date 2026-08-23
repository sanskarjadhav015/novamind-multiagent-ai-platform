import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../config/s3.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * ============================================================================
 * S3 PRESIGNED DOWNLOAD URL GENERATOR
 * ============================================================================
 * Generates secure, temporary download URLs for documents/images stored in S3.
 * ============================================================================
 * @param {string} filename - S3 object key
 * @param {number} expiresIn - Expiration time in seconds (default: 600s / 10m)
 */
export const getFromS3 = async (filename, expiresIn = 600) => {
    return await getSignedUrl(
        s3,
        new GetObjectCommand({
            Key: filename,
            Bucket: process.env.AWS_BUCKET_NAME,
            ResponseContentDisposition: `attachment; filename="${filename}"`
        }),
        { expiresIn }
    );
};