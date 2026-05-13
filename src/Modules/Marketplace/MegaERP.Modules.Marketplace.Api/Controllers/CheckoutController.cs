using System.Security.Claims;
using MegaERP.Modules.Marketplace.Core.DTOs;
using MegaERP.Modules.Marketplace.Core.Entities;
using MegaERP.Modules.Marketplace.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Marketplace.Api.Controllers;

/// <summary>Marketplace checkout — address + payment processing (mock).</summary>
[ApiController]
[Route("api/marketplace/checkout")]
[Authorize]
public class CheckoutController : ControllerBase
{
    private readonly MarketplaceDbContext _mkt;

    public CheckoutController(MarketplaceDbContext mkt) => _mkt = mkt;

    private Guid BuyerId => Guid.Parse(
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException());

    /// <summary>Returns available installment options for a given amount.</summary>
    [HttpGet("installments")]
    public ActionResult<List<InstallmentOption>> GetInstallments([FromQuery] decimal amount)
    {
        if (amount <= 0) return BadRequest("Tutar geçersiz.");
        return Ok(CalculateInstallments(amount));
    }

    /// <summary>Processes checkout: validates address, processes payment (mock), creates order.</summary>
    [HttpPost]
    public async Task<ActionResult<CheckoutResponse>> Checkout([FromBody] CheckoutRequest request)
    {
        // Validate address
        if (string.IsNullOrWhiteSpace(request.Address.RecipientName) ||
            string.IsNullOrWhiteSpace(request.Address.Phone) ||
            string.IsNullOrWhiteSpace(request.Address.City) ||
            string.IsNullOrWhiteSpace(request.Address.AddressLine))
            return Ok(new CheckoutResponse(false, "Teslimat adresi eksik veya hatalı.", null));

        // Validate payment method
        if (request.PaymentMethod == "Card")
        {
            if (request.Card is null)
                return Ok(new CheckoutResponse(false, "Kart bilgileri eksik.", null));

            var cardError = ValidateCard(request.Card);
            if (cardError is not null)
                return Ok(new CheckoutResponse(false, cardError, null));
        }

        var cartItems = await _mkt.CartItems.Where(c => c.BuyerUserId == BuyerId).ToListAsync();
        if (cartItems.Count == 0)
            return Ok(new CheckoutResponse(false, "Sepetiniz boş.", null));

        var subtotal = cartItems.Sum(c => c.UnitPrice * c.Quantity);

        // Calculate installment
        int installmentCount = 1;
        decimal installmentAmount = subtotal;
        if (request.PaymentMethod == "Card" && request.Card is not null)
        {
            installmentCount = Math.Max(1, request.Card.InstallmentCount);
            var rate = InstallmentRate(installmentCount);
            installmentAmount = Math.Round(subtotal * (1 + rate) / installmentCount, 2);
        }

        // Mock payment processing — always succeeds unless card starts with "0000"
        var paymentStatus = "Paid";
        if (request.PaymentMethod == "Card" && request.Card?.CardNumber.Replace(" ", "").StartsWith("0000") == true)
            return Ok(new CheckoutResponse(false, "Kart reddedildi. Lütfen bankanızla iletişime geçin.", null));

        // Create order
        var order = new BuyerOrder
        {
            BuyerUserId = BuyerId,
            TotalAmount = request.PaymentMethod == "Card"
                ? installmentAmount * installmentCount
                : subtotal,
            Status = request.PaymentMethod == "CashOnDelivery" ? "Confirmed" : "Processing",
            PaymentMethod = request.PaymentMethod,
            PaymentStatus = request.PaymentMethod == "CashOnDelivery" ? "Pending" : paymentStatus,
            InstallmentCount = installmentCount,
            InstallmentAmount = installmentAmount,
            CardLastFour = request.Card is not null
                ? request.Card.CardNumber.Replace(" ", "")[^4..]
                : null,
            CardBrand = request.Card is not null
                ? DetectCardBrand(request.Card.CardNumber)
                : null,
            RecipientName = request.Address.RecipientName,
            Phone = request.Address.Phone,
            City = request.Address.City,
            District = request.Address.District ?? string.Empty,
            AddressLine = request.Address.AddressLine,
            PostalCode = request.Address.PostalCode ?? string.Empty,
            Items = cartItems.Select(c => new BuyerOrderItem
            {
                ProductId = c.ProductId,
                VariantId = c.VariantId,
                ProductName = c.ProductName,
                VariantName = c.VariantName,
                ImageUrl = c.ImageUrl,
                UnitPrice = c.UnitPrice,
                Quantity = c.Quantity
            }).ToList()
        };

        _mkt.Orders.Add(order);
        _mkt.CartItems.RemoveRange(cartItems);
        await _mkt.SaveChangesAsync();

        return Ok(new CheckoutResponse(true, null, ToOrderDto(order)));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string? ValidateCard(CheckoutCardDto card)
    {
        var num = card.CardNumber.Replace(" ", "");
        if (num.Length < 13 || num.Length > 19 || !num.All(char.IsDigit))
            return "Kart numarası geçersiz.";
        if (!LuhnCheck(num))
            return "Kart numarası geçersiz (Luhn doğrulaması başarısız).";
        if (string.IsNullOrWhiteSpace(card.CardHolder))
            return "Kart üzerindeki ad eksik.";
        if (!int.TryParse(card.ExpiryMonth, out var m) || m < 1 || m > 12)
            return "Son kullanma tarihi (ay) geçersiz.";
        if (!int.TryParse(card.ExpiryYear, out var y))
            return "Son kullanma tarihi (yıl) geçersiz.";
        var expiry = new DateTime(y < 100 ? 2000 + y : y, m, 1).AddMonths(1).AddDays(-1);
        if (expiry < DateTime.UtcNow)
            return "Kartın son kullanma tarihi geçmiş.";
        if (card.Cvv.Length < 3 || !card.Cvv.All(char.IsDigit))
            return "CVV geçersiz.";
        return null;
    }

    private static bool LuhnCheck(string num)
    {
        int sum = 0;
        bool alternate = false;
        for (int i = num.Length - 1; i >= 0; i--)
        {
            int n = num[i] - '0';
            if (alternate) { n *= 2; if (n > 9) n -= 9; }
            sum += n;
            alternate = !alternate;
        }
        return sum % 10 == 0;
    }

    private static string DetectCardBrand(string num)
    {
        var n = num.Replace(" ", "");
        if (n.StartsWith("4")) return "Visa";
        if (n.StartsWith("5") && n[1] >= '1' && n[1] <= '5') return "Mastercard";
        if (n.StartsWith("2") && int.TryParse(n[..4], out var p) && p >= 2221 && p <= 2720) return "Mastercard";
        if (n.StartsWith("9792")) return "Troy";
        if (n.StartsWith("34") || n.StartsWith("37")) return "Amex";
        return "Kart";
    }

    private static decimal InstallmentRate(int count) => count switch
    {
        2 => 0.00m,
        3 => 0.00m,
        6 => 0.0199m,
        9 => 0.0349m,
        12 => 0.0499m,
        _ => 0m
    };

    private static List<InstallmentOption> CalculateInstallments(decimal amount)
    {
        var options = new List<InstallmentOption>
        {
            new(1, amount, amount, "Tek Çekim")
        };
        foreach (var count in new[] { 2, 3, 6, 9, 12 })
        {
            var rate = InstallmentRate(count);
            var total = Math.Round(amount * (1 + rate), 2);
            var monthly = Math.Round(total / count, 2);
            var label = count <= 3
                ? $"{count} Taksit — Faizsiz"
                : $"{count} Taksit — %{rate * 100:F1}/ay";
            options.Add(new(count, monthly, total, label));
        }
        return options;
    }

    internal static BuyerOrderDto ToOrderDto(BuyerOrder o) => new(
        o.Id, o.TotalAmount, o.Status, o.PaymentStatus, o.PaymentMethod,
        o.InstallmentCount, o.InstallmentAmount,
        o.CardLastFour, o.CardBrand,
        o.RecipientName, o.Phone, o.City, o.District, o.AddressLine, o.PostalCode,
        o.CreatedAt,
        o.Items.Select(i => new BuyerOrderItemDto(
            i.ProductId, i.VariantId, i.ProductName, i.VariantName, i.ImageUrl, i.UnitPrice, i.Quantity
        )).ToList()
    );
}
