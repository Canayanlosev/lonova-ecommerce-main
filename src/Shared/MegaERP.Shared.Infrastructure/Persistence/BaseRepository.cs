using System.Linq.Expressions;
using MegaERP.Shared.Core.Entities;
using MegaERP.Shared.Core.Interfaces;
using MegaERP.Shared.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Shared.Infrastructure.Persistence;

public class BaseRepository<T, TContext> : IBaseRepository<T> 
    where T : BaseEntity 
    where TContext : DbContext
{
    protected readonly TContext _context;
    protected readonly DbSet<T> _dbSet;

    public BaseRepository(TContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(Guid id) => await _dbSet.FindAsync(id);

    public virtual async Task<IEnumerable<T>> GetAllAsync() => await _dbSet.ToListAsync();

    public virtual async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate) => 
        await _dbSet.Where(predicate).ToListAsync();

    public virtual async Task AddAsync(T entity) => await _dbSet.AddAsync(entity);

    public virtual void Update(T entity) => _context.Entry(entity).State = EntityState.Modified;

    public virtual void Delete(T entity) => _dbSet.Remove(entity);

    public virtual async Task<int> SaveChangesAsync() => await _context.SaveChangesAsync();
}
