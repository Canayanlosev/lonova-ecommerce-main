namespace MegaERP.Modules.Billing.Core.DTOs;

public record InvoiceItemDto(
    Guid Id,
    string Description,
    int Quantity,
    decimal UnitPrice,
    decimal TaxRate,
    decimal LineTotal);

public record InvoiceDto(
    Guid Id,
    string InvoiceNumber,
    Guid OrderId,
    DateTime InvoiceDate,
    DateTime DueDate,
    decimal TotalAmount,
    decimal TotalTax,
    string Status,
    List<InvoiceItemDto> Items);

public record UpdateInvoiceStatusRequest(string Status);
