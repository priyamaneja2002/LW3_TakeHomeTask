export class HttpError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFound = (message) => new HttpError(404, message);
export const badRequest = (message) => new HttpError(400, message);
export const forbidden = (message) => new HttpError(403, message);
export const unauthorized = (message) => new HttpError(401, message);
