namespace MegaERP.Modules.Marketplace.Core.DTOs;

public record BuyerRegisterRequest(string FirstName, string LastName, string Email, string Password);
public record BuyerLoginRequest(string Email, string Password);
public record BuyerAuthResponse(string Token, string UserId, string Email, string FirstName, string LastName);
public record BuyerChangePasswordRequest(string CurrentPassword, string NewPassword);

public record AddToCartRequest(Guid ProductId, Guid? VariantId, int Quantity = 1);
public record CartItemDto(Guid Id, Guid ProductId, Guid? VariantId, string ProductName, string? VariantName, string? ImageUrl, decimal UnitPrice, int Quantity, decimal LineTotal);
public record CartDto(List<CartItemDto> Items, decimal Total, int ItemCount);

public record BuyerOrderItemDto(Guid ProductId, Guid? VariantId, string ProductName, string? VariantName, string? ImageUrl, decimal UnitPrice, int Quantity);

public record BuyerOrderDto(
    Guid Id,
    decimal TotalAmount,
    string Status,
    string PaymentStatus,
    string PaymentMethod,
    int InstallmentCount,
    decimal InstallmentAmount,
    string? CardLastFour,
    string? CardBrand,
    string RecipientName,
    string Phone,
    string City,
    string District,
    string AddressLine,
    string PostalCode,
    DateTime CreatedAt,
    List<BuyerOrderItemDto> Items,
    // Cancellation (TASK-24)
    DateTime? CancelledAt = null,
    string? CancelReason = null,
    string? RefundStatus = null,
    // Shipping (TASK-26)
    string? TrackingNumber = null,
    string? CarrierName = null
);

public record CheckoutAddressDto(
    string RecipientName,
    string Phone,
    string City,
    string District,
    string AddressLine,
    string PostalCode
);

// Card payment — CardNumber is plaintext, we store only last 4
public record CheckoutCardDto(
    string CardNumber,
    string CardHolder,
    string ExpiryMonth,
    string ExpiryYear,
    string Cvv,
    int InstallmentCount = 1
);

public record CheckoutRequest(
    CheckoutAddressDto Address,
    string PaymentMethod,          // Card | BankTransfer | CashOnDelivery
    CheckoutCardDto? Card,         // required when PaymentMethod == "Card"
    string? CouponCode             // optional discount coupon
);

public record CheckoutResponse(
    bool Success,
    string? ErrorMessage,
    BuyerOrderDto? Order
);

public record InstallmentOption(int Count, decimal MonthlyAmount, decimal TotalAmount, string Label);

// TASK-24
public record CancelOrderRequest(string? Reason);
public record RefundRequestDto(string Reason);

// TASK-26
public record ShipOrderRequest(string TrackingNumber, string CarrierName);
public record AdminOrderDto(
    Guid Id,
    Guid BuyerUserId,
    decimal TotalAmount,
    string Status,
    string PaymentStatus,
    string PaymentMethod,
    string RecipientName,
    string Phone,
    string City,
    string District,
    string AddressLine,
    DateTime CreatedAt,
    int ItemCount,
    string? TrackingNumber,
    string? CarrierName,
    string? CancelReason,
    string? RefundStatus
);

// TASK-27
public record BuyerAddressDto(
    Guid Id,
    string Title,
    string RecipientName,
    string Phone,
    string City,
    string District,
    string AddressLine,
    string PostalCode,
    bool IsDefault
);
public record CreateAddressRequest(
    string Title,
    string RecipientName,
    string Phone,
    string City,
    string District,
    string AddressLine,
    string PostalCode,
    bool IsDefault = false
);

public record CreateReviewRequest(int Rating, string? Comment);
public record ProductReviewDto(Guid Id, Guid BuyerUserId, string BuyerName, int Rating, string? Comment, DateTime CreatedAt);
public record ProductReviewsResponse(List<ProductReviewDto> Items, int TotalCount, decimal AverageRating, int Page, int PageSize);

public record MarketplaceProductDto(
    Guid Id,
    string Name,
    string? Description,
    string Sku,
    string? Slug,
    string? ImageUrl,
    decimal BasePrice,
    Guid CategoryId,
    string? CategoryName,
    List<MarketplaceVariantDto> Variants,
    decimal AverageRating = 0,
    int ReviewCount = 0
);

public record MarketplaceVariantDto(
    Guid Id,
    string Name,
    string VariantType,
    string? ColorHex,
    string Sku,
    decimal Price,
    int StockQuantity
);

public record MarketplaceProductListResponse(
    List<MarketplaceProductDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);

// ── Coupon DTOs ──────────────────────────────────────────────────────────────
public record CreateCouponRequest(
    string Code,
    string DiscountType,           // Percent | Fixed
    decimal DiscountValue,
    decimal MinimumOrderAmount,
    int MaxUses,
    DateTime? ExpiresAt
);

public record UpdateCouponRequest(
    string? DiscountType,
    decimal? DiscountValue,
    decimal? MinimumOrderAmount,
    int? MaxUses,
    DateTime? ExpiresAt,
    bool? IsActive
);

public record CouponDto(
    Guid Id,
    string Code,
    string DiscountType,
    decimal DiscountValue,
    decimal MinimumOrderAmount,
    int MaxUses,
    int UsedCount,
    DateTime? ExpiresAt,
    bool IsActive
);

public record ValidateCouponRequest(string Code, decimal CartTotal);
public record ValidateCouponResponse(bool Valid, string? Message, decimal DiscountAmount, CouponDto? Coupon);
