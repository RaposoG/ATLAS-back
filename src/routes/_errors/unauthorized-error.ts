export class UnauthorizedError extends Error {
  statusCode: number;

  constructor(message?: string) {
    super(message ?? "Unauthorized");
    this.statusCode = 401;
  }

  toResponse() {
    return {
      statusCode: this.statusCode,
      error: "Unauthorized",
      message: this.message,
    };
  }
}
