// utils/parameterMapper.js - Smart Parameter Mapping Utility
// Combines explicit mapping with generic fallback

/**
 * Smart parameter mapper that handles:
 * 1. Known parameter mappings (camelCase -> PascalCase)
 * 2. Type conversions (string -> Date, string -> Boolean)
 * 3. Generic passthrough for unknown parameters
 * 4. Future-proofing with minimal hardcoding
 */

class ParameterMapper {
  constructor() {
    // Define known parameter mappings - this is the ONLY hardcoded part
    this.knownMappings = {
      // Common parameters across tools
      bucketName: "Bucket",
      fileName: "Key",
      fileContent: "Body", // Special handling needed

      // createBucket specific
      objectLockEnabledForBucket: "ObjectLockEnabledForBucket",
      acl: "ACL",
      locationConstraint: "CreateBucketConfiguration.LocationConstraint", // Special nested handling
      objectOwnership: "ObjectOwnership",

      // getObject specific
      ifMatch: "IfMatch",
      ifModifiedSince: "IfModifiedSince",
      ifNoneMatch: "IfNoneMatch",
      ifUnmodifiedSince: "IfUnmodifiedSince",
      range: "Range",
      responseCacheControl: "ResponseCacheControl",
      responseContentType: "ResponseContentType",
      responseContentDisposition: "ResponseContentDisposition",
      responseContentEncoding: "ResponseContentEncoding",
      responseContentLanguage: "ResponseContentLanguage",
      responseExpires: "ResponseExpires",
      versionId: "VersionId",
      sseCustomerAlgorithm: "SSECustomerAlgorithm",
      sseCustomerKey: "SSECustomerKey",
      sseCustomerKeyMD5: "SSECustomerKeyMD5",
      requestPayer: "RequestPayer",
      partNumber: "PartNumber",
      expectedBucketOwner: "ExpectedBucketOwner",
      checksumMode: "ChecksumMode",

      // putObject specific
      cacheControl: "CacheControl",
      contentDisposition: "ContentDisposition",
      contentEncoding: "ContentEncoding",
      contentLanguage: "ContentLanguage",
      contentLength: "ContentLength",
      contentMD5: "ContentMD5",
      contentType: "ContentType",
      checksumAlgorithm: "ChecksumAlgorithm",
      checksumCRC32: "ChecksumCRC32",
      checksumCRC32C: "ChecksumCRC32C",
      checksumSHA1: "ChecksumSHA1",
      checksumSHA256: "ChecksumSHA256",
      expires: "Expires",
      ifNoneMatch: "IfNoneMatch",
      grantFullControl: "GrantFullControl",
      grantRead: "GrantRead",
      grantReadACP: "GrantReadACP",
      grantWriteACP: "GrantWriteACP",
      metadata: "Metadata",
      serverSideEncryption: "ServerSideEncryption",
      storageClass: "StorageClass",
      websiteRedirectLocation: "WebsiteRedirectLocation",
      sseKMSKeyId: "SSEKMSKeyId",
      sseKMSEncryptionContext: "SSEKMSEncryptionContext",
      bucketKeyEnabled: "BucketKeyEnabled",
      tagging: "Tagging",
      objectLockMode: "ObjectLockMode",
      objectLockRetainUntilDate: "ObjectLockRetainUntilDate",
      objectLockLegalHoldStatus: "ObjectLockLegalHoldStatus",

      // listBuckets specific
      maxBuckets: "MaxBuckets",
      continuationToken: "ContinuationToken",
      prefix: "Prefix",
      bucketRegion: "BucketRegion",

      // deleteObject specific
      mfa: "MFA",
      bypassGovernanceRetention: "BypassGovernanceRetention",
    };

    // Parameters that need type conversion
    this.dateParameters = [
      "IfModifiedSince",
      "IfUnmodifiedSince",
      "ResponseExpires",
      "Expires",
      "ObjectLockRetainUntilDate",
    ];

    this.booleanParameters = ["ObjectLockEnabledForBucket", "BucketKeyEnabled"];
  }

  /**
   * Maps parameters from AI format to AWS SDK format
   * @param {Object} inputParams - Parameters from AI
   * @param {Object} options - Mapping options
   * @returns {Object} - AWS SDK formatted parameters
   */
  mapParameters(inputParams, options = {}) {
    const result = {};
    const unmappedParams = {};

    console.log(
      "🔄 Smart Parameter Mapping Input:",
      JSON.stringify(inputParams, null, 2)
    );

    for (const [key, value] of Object.entries(inputParams)) {
      if (value === undefined || value === null) continue;

      const mappedKey = this.knownMappings[key];

      if (mappedKey) {
        // Handle special nested cases
        if (mappedKey.includes(".")) {
          this.handleNestedParameter(result, mappedKey, value);
        } else {
          // Apply type conversion if needed
          result[mappedKey] = this.convertType(mappedKey, value);
        }
      } else {
        // Unknown parameter - try smart case conversion as fallback
        const smartMappedKey = this.smartCaseConversion(key);
        unmappedParams[smartMappedKey] = value;
      }
    }

    // Add unmapped parameters (generic passthrough)
    Object.assign(result, unmappedParams);

    console.log(
      "✅ Smart Parameter Mapping Output:",
      JSON.stringify(result, null, 2)
    );
    console.log("🔍 Unmapped Parameters:", Object.keys(unmappedParams));

    return result;
  }

  /**
   * Handle nested parameters like CreateBucketConfiguration.LocationConstraint
   */
  handleNestedParameter(result, mappedKey, value) {
    const parts = mappedKey.split(".");
    if (parts.length === 2) {
      const [parent, child] = parts;
      if (!result[parent]) result[parent] = {};
      result[parent][child] = value;
    }
  }

  /**
   * Convert parameter value to appropriate type
   */
  convertType(key, value) {
    if (this.dateParameters.includes(key)) {
      return new Date(value);
    }

    if (this.booleanParameters.includes(key)) {
      return value === true || value === "true";
    }

    return value;
  }

  /**
   * Smart case conversion as fallback for unknown parameters
   * camelCase -> PascalCase
   */
  smartCaseConversion(camelCaseKey) {
    // Convert camelCase to PascalCase
    return camelCaseKey.charAt(0).toUpperCase() + camelCaseKey.slice(1);
  }

  /**
   * Add new parameter mapping at runtime
   */
  addMapping(camelCase, pascalCase, type = null) {
    this.knownMappings[camelCase] = pascalCase;
    if (type === "date") {
      this.dateParameters.push(pascalCase);
    } else if (type === "boolean") {
      this.booleanParameters.push(pascalCase);
    }
    console.log(
      `📝 Added new parameter mapping: ${camelCase} -> ${pascalCase}`
    );
  }
}

module.exports = new ParameterMapper();
