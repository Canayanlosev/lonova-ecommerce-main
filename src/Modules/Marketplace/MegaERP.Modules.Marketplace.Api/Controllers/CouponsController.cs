using MegaERP.Modules.Marketplace.Core.DTOs;
using MegaERP.Modules.Marketplace.Core.Entities;
using MegaERP.Modules.Marketplace.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Marketplace.Api.Controllers;

/// <summary>Admin endpoints for managing discount coupon codes.</summary>
[ApiController]
[Route("api/marketplace/admin/coupons")]
[Authorize]
public class AdminCouponsController : ControllerBase
{
    private readonly MarketplaceDbContext _context;

    public AdminCouponsController(MarketplaceDbContext context)
    {
        _context = context;
    }

    /// <summary>List all coupons.</summary>
    [HttpGet]
    public async Task<ActionResult<List<CouponDto>>> GetAll()
    {
        var coupons = await _context.CouponCodes
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => ToDto(c))
            .ToListAsync();

        return Ok(coupons);
    }

    /// <summary>Get a single coupon by ID.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CouponDto>> GetById(Guid id)
    {
        var coupon = await _context.CouponCodes.FindAsync(id);
        if (coupon is null) return NotFound();
        return Ok(ToDto(coupon));
    }

    /// <summary>Create a new discount coupon.</summary>
    [HttpPost]
    public async Task<ActionResult<CouponDto>> Create(CreateCouponRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest("Kupon kodu zorunludur.");

        var code = request.Code.Trim().ToUpperInvariant();

        if (request.DiscountType != "Percent" && request.DiscountType != "Fixed")
            return BadRequest("İndirim tipi 'Percent' veya 'Fixed' olmalıdır.");

        if (request.DiscountValue <= 0)
            return BadRequest("İndirim değeri sıfırdan büyük olmalıdır.");

        if (request.DiscountType == "Percent" && request.DiscountValue > 100)
            return BadRequest("Yüzde indirim 100'den büyük olamaz.");

        if (await _context.CouponCodes.AnyAsync(c => c.Code == code))
            return Conflict("Bu kupon kodu zaten mevcut.");

        var coupon = new CouponCode
        {
            Code = code,
            DiscountType = request.DiscountType,
            DiscountValue = request.DiscountValue,
            MinimumOrderAmount = request.MinimumOrderAmount,
            MaxUses = request.MaxUses,
            ExpiresAt = request.ExpiresAt,
            IsActive = true
        };

        _context.CouponCodes.Add(coupon);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = coupon.Id }, ToDto(coupon));
    }

    /// <summary>Update coupon settings.</summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CouponDto>> Update(Guid id, UpdateCouponRequest request)
    {
        var coupon = await _context.CouponCodes.FindAsync(id);
        if (coupon is null) return NotFound();

        if (request.DiscountType is not null)
        {
            if (request.DiscountType != "Percent" && request.DiscountType != "Fixed")
                return BadRequest("İndirim tipi 'Percent' veya 'Fixed' olmalıdır.");
            coupon.DiscountType = request.DiscountType;
        }

        if (request.DiscountValue is not null)
        {
            if (request.DiscountValue.Value <= 0) return BadRequest("İndirim değeri sıfırdan büyük olmalıdır.");
            coupon.DiscountValue = request.DiscountValue.Value;
        }

        if (request.MinimumOrderAmount is not null)
            coupon.MinimumOrderAmount = request.MinimumOrderAmount.Value;

        if (request.MaxUses is not null)
            coupon.MaxUses = request.MaxUses.Value;

        if (request.ExpiresAt is not null)
            coupon.ExpiresAt = request.ExpiresAt;

        if (request.IsActive is not null)
            coupon.IsActive = request.IsActive.Value;

        _context.Update(coupon);
        await _context.SaveChangesAsync();
        return Ok(ToDto(coupon));
    }

    /// <summary>Delete a coupon.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var coupon = await _context.CouponCodes.FindAsync(id);
        if (coupon is null) return NotFound();
        _context.CouponCodes.Remove(coupon);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static CouponDto ToDto(CouponCode c) => new(
        c.Id, c.Code, c.DiscountType, c.DiscountValue, c.MinimumOrderAmount,
        c.MaxUses, c.UsedCount, c.ExpiresAt, c.IsActive);
}

/// <summary>Buyer-facing coupon validation endpoint.</summary>
[ApiController]
[Route("api/marketplace/coupons")]
public class BuyerCouponsController : ControllerBase
{
    private readonly MarketplaceDbContext _context;

    public BuyerCouponsController(MarketplaceDbContext context)
    {
        _context = context;
    }

    /// <summary>Validate a coupon code and get the discount amount for a given cart total.</summary>
    [HttpPost("validate")]
    [AllowAnonymous]
    public async Task<ActionResult<ValidateCouponResponse>> Validate(ValidateCouponRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            return Ok(new ValidateCouponResponse(false, "Kupon kodu boş olamaz.", 0, null));

        var code = request.Code.Trim().ToUpperInvariant();
        var coupon = await _context.CouponCodes.FirstOrDefaultAsync(c => c.Code == code);

        if (coupon is null || !coupon.IsActive)
            return Ok(new ValidateCouponResponse(false, "Kupon kodu geçersiz veya aktif değil.", 0, null));

        if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt.Value < DateTime.UtcNow)
            return Ok(new ValidateCouponResponse(false, "Kupon süresi dolmuş.", 0, null));

        if (coupon.MaxUses > 0 && coupon.UsedCount >= coupon.MaxUses)
            return Ok(new ValidateCouponResponse(false, "Kupon kullanım limiti dolmuş.", 0, null));

        if (request.CartTotal < coupon.MinimumOrderAmount)
            return Ok(new ValidateCouponResponse(false,
                $"Bu kuponu kullanmak için minimum sepet tutarı {coupon.MinimumOrderAmount:C2} olmalıdır.", 0, null));

        decimal discount = coupon.DiscountType == "Percent"
            ? Math.Round(request.CartTotal * coupon.DiscountValue / 100, 2)
            : Math.Min(coupon.DiscountValue, request.CartTotal);

        var dto = new CouponDto(coupon.Id, coupon.Code, coupon.DiscountType, coupon.DiscountValue,
            coupon.MinimumOrderAmount, coupon.MaxUses, coupon.UsedCount, coupon.ExpiresAt, coupon.IsActive);

        return Ok(new ValidateCouponResponse(true, null, discount, dto));
    }
}
