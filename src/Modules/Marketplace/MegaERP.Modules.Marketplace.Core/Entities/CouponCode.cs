using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Marketplace.Core.Entities;

/// <summary>Discount coupon code that can be applied during checkout.</summary>
public class CouponCode : BaseEntity
{
    /// <summary>The code buyers type at checkout (e.g. SUMMER20).</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Percent | Fixed</summary>
    public string DiscountType { get; set; } = "Percent";

    /// <summary>Discount amount: percentage (0-100) or fixed TRY amount.</summary>
    public decimal DiscountValue { get; set; }

    /// <summary>Minimum cart total required to use this coupon (0 = no minimum).</summary>
    public decimal MinimumOrderAmount { get; set; } = 0;

    /// <summary>Maximum number of total uses (0 = unlimited).</summary>
    public int MaxUses { get; set; } = 0;

    /// <summary>How many times this coupon has been used.</summary>
    public int UsedCount { get; set; } = 0;

    /// <summary>Optional expiry date.</summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>Whether this coupon is currently active.</summary>
    public bool IsActive { get; set; } = true;
}
