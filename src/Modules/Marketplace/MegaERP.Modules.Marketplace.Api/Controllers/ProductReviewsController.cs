using System.Security.Claims;
using MegaERP.Modules.Marketplace.Core.DTOs;
using MegaERP.Modules.Marketplace.Core.Entities;
using MegaERP.Modules.Marketplace.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Marketplace.Api.Controllers;

/// <summary>Product reviews — authenticated buyers can leave one review per product.</summary>
[ApiController]
[Route("api/marketplace/products/{productId:guid}/reviews")]
public class ProductReviewsController : ControllerBase
{
    private readonly MarketplaceDbContext _mkt;

    public ProductReviewsController(MarketplaceDbContext mkt) => _mkt = mkt;

    private Guid? CurrentBuyerId
    {
        get
        {
            var val = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            return val is not null && Guid.TryParse(val, out var id) ? id : null;
        }
    }

    /// <summary>Returns paginated reviews for a product, newest first.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ProductReviewsResponse>> GetReviews(
        Guid productId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        page = Math.Max(1, page);

        var query = _mkt.ProductReviews.Where(r => r.ProductId == productId);
        var total = await query.CountAsync();
        var avg = total > 0 ? await query.AverageAsync(r => (double)r.Rating) : 0;

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new ProductReviewDto(r.Id, r.BuyerUserId, r.BuyerName, r.Rating, r.Comment, r.CreatedAt))
            .ToListAsync();

        return Ok(new ProductReviewsResponse(items, total, (decimal)Math.Round(avg, 1), page, pageSize));
    }

    /// <summary>Creates a review. One review per buyer per product; rating must be 1-5.</summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ProductReviewDto>> CreateReview(Guid productId, [FromBody] CreateReviewRequest request)
    {
        if (CurrentBuyerId is null) return Unauthorized();
        var buyerId = CurrentBuyerId.Value;

        if (request.Rating < 1 || request.Rating > 5)
            return BadRequest("Puan 1 ile 5 arasında olmalıdır.");

        var exists = await _mkt.ProductReviews.AnyAsync(r => r.ProductId == productId && r.BuyerUserId == buyerId);
        if (exists)
            return Conflict("Bu ürün için zaten yorum yaptınız.");

        var buyer = await _mkt.BuyerUsers.FindAsync(buyerId);
        if (buyer is null) return Unauthorized();

        var review = new ProductReview
        {
            ProductId = productId,
            BuyerUserId = buyerId,
            BuyerName = $"{buyer.FirstName} {buyer.LastName[..1]}.",
            Rating = request.Rating,
            Comment = request.Comment?.Trim()
        };

        _mkt.ProductReviews.Add(review);
        await _mkt.SaveChangesAsync();

        return Ok(new ProductReviewDto(review.Id, review.BuyerUserId, review.BuyerName, review.Rating, review.Comment, review.CreatedAt));
    }

    /// <summary>Deletes the authenticated buyer's own review.</summary>
    [HttpDelete("{reviewId:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteReview(Guid productId, Guid reviewId)
    {
        if (CurrentBuyerId is null) return Unauthorized();

        var review = await _mkt.ProductReviews
            .FirstOrDefaultAsync(r => r.Id == reviewId && r.ProductId == productId && r.BuyerUserId == CurrentBuyerId.Value);

        if (review is null) return NotFound();

        _mkt.ProductReviews.Remove(review);
        await _mkt.SaveChangesAsync();
        return NoContent();
    }
}
