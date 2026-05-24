using MegaERP.Modules.Ecommerce.Infrastructure.Persistence;
using MegaERP.Modules.Marketplace.Core.DTOs;
using MegaERP.Modules.Marketplace.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Marketplace.Api.Controllers;

/// <summary>Admin: view and moderate product reviews.</summary>
[ApiController]
[Route("api/marketplace/admin/reviews")]
[Authorize]
public class AdminReviewsController : ControllerBase
{
    private readonly MarketplaceDbContext _mkt;
    private readonly EcommerceDbContext _ecom;

    public AdminReviewsController(MarketplaceDbContext mkt, EcommerceDbContext ecom)
    {
        _mkt = mkt;
        _ecom = ecom;
    }

    /// <summary>Returns all reviews with product name, paginated. Filter by productId or rating.</summary>
    [HttpGet]
    public async Task<ActionResult> GetReviews(
        [FromQuery] Guid? productId = null,
        [FromQuery] int? minRating = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page = Math.Max(1, page);

        var query = _mkt.ProductReviews.AsQueryable();
        if (productId.HasValue) query = query.Where(r => r.ProductId == productId.Value);
        if (minRating.HasValue) query = query.Where(r => r.Rating >= minRating.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Build product name map via EcommerceDbContext
        var productIds = items.Select(r => r.ProductId).Distinct().ToList();
        var productNames = await _ecom.Products
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Name })
            .ToDictionaryAsync(p => p.Id, p => p.Name);

        var dtos = items.Select(r => new AdminReviewDto(
            r.Id,
            r.ProductId,
            productNames.GetValueOrDefault(r.ProductId, "—"),
            r.BuyerUserId,
            r.BuyerName,
            r.Rating,
            r.Comment,
            r.CreatedAt,
            IsVerifiedPurchase: true // all existing reviews passed purchase check
        )).ToList();

        return Ok(new { items = dtos, totalCount = total, page, pageSize });
    }

    /// <summary>Deletes a review (moderation).</summary>
    [HttpDelete("{reviewId:guid}")]
    public async Task<IActionResult> DeleteReview(Guid reviewId)
    {
        var review = await _mkt.ProductReviews.FindAsync(reviewId);
        if (review is null) return NotFound();

        _mkt.ProductReviews.Remove(review);
        await _mkt.SaveChangesAsync();
        return NoContent();
    }
}
