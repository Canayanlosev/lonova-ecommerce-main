using System.Linq.Expressions;
using MegaERP.Shared.Core.Entities;

namespace MegaERP.Shared.Core.Interfaces;

public interface IBaseRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task AddAsync(T entity);
    void Update(T entity);
    void Delete(T entity);
    Task<int> SaveChangesAsync();
}

public interface ITenantRepository<T> : IBaseRepository<T> where T : BaseTenantEntity
{
    // Tenant filtering is handled automatically in the DbContext, 
    // but we can add tenant-specific logic here if needed.
}
